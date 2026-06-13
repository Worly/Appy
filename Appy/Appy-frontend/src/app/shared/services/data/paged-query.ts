import { BehaviorSubject, Observable, ReplaySubject, take } from "rxjs";
import { getInsertIndex, isSorted } from "src/app/utils/array-utils";
import { PageDirection, PagedResult } from "./contracts";

export interface PagedQueryOptions<T> {
    /** Fetch one raw page from the backend. Forwards pages come back ascending; backwards pages descending (nearest-to-anchor first). */
    loadPage: (dir: PageDirection, skip: number, take: number) => Observable<T[]>;
    /** Global sort order the buffer is kept in. Must match the backend's sort. */
    sort: (a: T, b: T) => number;
    /** Optional client-side predicate; non-matching items are dropped from the buffer (but still count toward the backend skip). */
    filter?: (item: T) => boolean;
    /** Items per page. Defaults to 20. */
    pageSize?: number;
}

/**
 * Builds a {@link PagedResult}: a bidirectional, infinitely-scrolling page buffer.
 *
 * This is the page-buffer half of the old `PageableListDatasource`, with the
 * entity-change-notify subscription and the `updateEntity` in-place sync removed.
 * The buffer is per-view state disposed when the subscription to `items$` is dropped —
 * it is not cross-component sync, so it is preserved here. Pagination is unchanged.
 */
export function pagedQuery<T>(opts: PagedQueryOptions<T>): PagedResult<T> {
    const pageSize = opts.pageSize ?? 20;
    const passesFilter = opts.filter ?? (() => true);

    const items$ = new ReplaySubject<T[]>(1);
    const loadingForwards$ = new BehaviorSubject<boolean>(false);
    const loadingBackwards$ = new BehaviorSubject<boolean>(false);
    const loading$ = new BehaviorSubject<boolean>(false);
    const error$ = new BehaviorSubject<unknown>(undefined);

    let data: T[] = [];
    let forwardsSkip = 0;
    let backwardsSkip = 0;
    let reachedEndForwards = false;
    let reachedEndBackwards = false;
    let firstLoadDone = false;

    const loadingSubject = (dir: PageDirection) => dir === "forwards" ? loadingForwards$ : loadingBackwards$;
    const isLoading = (dir: PageDirection) => loadingSubject(dir).value;
    const setLoading = (dir: PageDirection, value: boolean) => {
        loadingSubject(dir).next(value);
        loading$.next(loadingForwards$.value || loadingBackwards$.value);
    };

    const runLoad = (dir: PageDirection) => {
        if (isLoading(dir))
            return;
        if (dir === "forwards" ? reachedEndForwards : reachedEndBackwards)
            return;

        setLoading(dir, true);
        const skip = dir === "forwards" ? forwardsSkip : backwardsSkip;

        opts.loadPage(dir, skip, pageSize).pipe(take(1)).subscribe({
            next: page => {
                if (dir === "forwards") {
                    forwardsSkip += page.length;
                    if (page.length < pageSize) reachedEndForwards = true;
                } else {
                    backwardsSkip += page.length;
                    if (page.length < pageSize) reachedEndBackwards = true;
                }

                // Backwards pages arrive descending; reverse so the whole page is ascending.
                const ascendingPage = dir === "backwards" ? [...page].reverse() : page;

                if (!isSorted(ascendingPage, opts.sort)) {
                    error$.next(new Error("Received page is not correctly sorted. Check if backend sort matches frontend sort!"));
                    setLoading(dir, false);
                    return;
                }

                for (const item of ascendingPage) {
                    if (!passesFilter(item))
                        continue;
                    data.splice(getInsertIndex(data, item, opts.sort), 0, item);
                }

                firstLoadDone = true;
                setLoading(dir, false);
                items$.next([...data]);
            },
            error: e => {
                error$.next(e);
                setLoading(dir, false);
            }
        });
    };

    // Kick off the initial page from the anchor.
    runLoad("forwards");

    return {
        items$: items$.asObservable(),
        loading$: loading$.asObservable(),
        loadingForwards$: loadingForwards$.asObservable(),
        loadingBackwards$: loadingBackwards$.asObservable(),
        error$: error$.asObservable(),
        loadMore: (dir: PageDirection) => {
            // Wait for the first page before honouring user-driven pagination.
            if (!firstLoadDone)
                return;
            runLoad(dir);
        },
        hasMore: (dir: PageDirection) => dir === "forwards" ? !reachedEndForwards : !reachedEndBackwards,
        refetch: () => {
            data = [];
            forwardsSkip = 0;
            backwardsSkip = 0;
            reachedEndForwards = false;
            reachedEndBackwards = false;
            firstLoadDone = false;
            loadingForwards$.next(false);
            loadingBackwards$.next(false);
            loading$.next(false);
            error$.next(undefined);
            runLoad("forwards");
        }
    };
}
