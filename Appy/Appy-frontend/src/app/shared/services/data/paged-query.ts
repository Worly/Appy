import { InfiniteData, InfiniteQueryObserver, InfiniteQueryObserverResult, QueryClient } from "@tanstack/query-core";
import { Observable, distinctUntilChanged, firstValueFrom, map, shareReplay } from "rxjs";
import { getInsertIndex, isSorted } from "src/app/utils/array-utils";
import { CacheKey } from "./cache-coordinator";
import { PageDirection, PagedResult } from "./contracts";

/** The param each page is fetched with. `dir` selects the endpoint direction; `skip` is the backend offset for that direction. */
interface PageParam {
    dir: PageDirection;
    skip: number;
}

export interface PagedQueryOptions<T> {
    /** TanStack cache key for this list (include the params/filter that scope it). */
    queryKey: CacheKey;
    /** Fetch one raw page. Forwards pages come back ascending; backwards pages descending (nearest-to-anchor first). */
    loadPage: (dir: PageDirection, skip: number, take: number) => Observable<T[]>;
    /** Global sort order the buffer is kept in. Must match the backend's sort. */
    sort: (a: T, b: T) => number;
    /** Optional client-side predicate; non-matching items are dropped from the buffer (but still count toward the backend skip). */
    filter?: (item: T) => boolean;
    /** Items per page. Defaults to 20. */
    pageSize?: number;
}

/**
 * Builds a {@link PagedResult}: a bidirectional, infinitely-scrolling list backed by a
 * TanStack {@link InfiniteQueryObserver}.
 *
 * `data.pages` is ordered [...backwards (earliest first), anchor, ...forwards (latest last)].
 * Each page is oriented ascending (backwards pages are reversed), checked against `sort`,
 * filtered, and sorted-inserted into one globally-sorted buffer for `items$`. The observer is
 * created lazily on first subscription and destroyed when the last subscriber leaves (mirrors
 * `query()`); a route-reused component that keeps its subscription alive across detach keeps
 * the observer active, so invalidation refetches its loaded pages in the background.
 */
export function pagedQuery<T>(client: QueryClient, opts: PagedQueryOptions<T>): PagedResult<T> {
    const pageSize = opts.pageSize ?? 20;
    const passesFilter = opts.filter ?? (() => true);

    /** Flatten pages into one globally-sorted, filtered buffer (the old PageableListDatasource merge). Returns a sort error instead of throwing. */
    const buildItems = (pages: T[][] | undefined, pageParams: PageParam[] | undefined): { items: T[]; error: unknown } => {
        const data: T[] = [];
        if (pages == null || pageParams == null)
            return { items: data, error: undefined };

        for (let i = 0; i < pages.length; i++) {
            const param = pageParams[i];
            // Backwards pages arrive descending; reverse so the page is ascending.
            const ascending = param?.dir === "backwards" ? [...pages[i]].reverse() : pages[i];

            if (!isSorted(ascending, opts.sort))
                return { items: [], error: new Error("Received page is not correctly sorted. Check if backend sort matches frontend sort!") };

            for (const item of ascending) {
                if (!passesFilter(item))
                    continue;
                data.splice(getInsertIndex(data, item, opts.sort), 0, item);
            }
        }
        return { items: data, error: undefined };
    };

    type Result = InfiniteQueryObserverResult<InfiniteData<T[], PageParam>, unknown>;
    let observer: InfiniteQueryObserver<T[], unknown, InfiniteData<T[], PageParam>, unknown[], PageParam> | null = null;
    let latest: Result | null = null;

    const result$ = new Observable<Result>(sub => {
        const o = new InfiniteQueryObserver<T[], unknown, InfiniteData<T[], PageParam>, unknown[], PageParam>(client, {
            queryKey: opts.queryKey as unknown[],
            // No special gcTime: a torn-down list lingers in the cache for the default 5 min like any
            // other query. On revisit to the same anchor it repaints the cached pages instantly and the
            // staleTime-0 background refetch corrects them — standard invalidation behaviour; the brief
            // pre-edit flash is acceptable. (CacheCoordinator.clear() still wipes it on facility/logout.)
            queryFn: ({ pageParam }) => firstValueFrom(opts.loadPage(pageParam.dir, pageParam.skip, pageSize)),
            initialPageParam: { dir: "forwards", skip: 0 },
            getNextPageParam: (lastPage, _all, lastParam) =>
                lastPage.length < pageSize ? undefined : { dir: "forwards", skip: lastParam.skip + lastPage.length },
            getPreviousPageParam: (firstPage, _all, firstParam) => {
                // No backwards page fetched yet (first page is still the forwards anchor) → start backwards at skip 0.
                if (firstParam.dir === "forwards")
                    return { dir: "backwards", skip: 0 };
                // Otherwise firstPage is the most-recent backwards page; stop on a partial page.
                return firstPage.length < pageSize ? undefined : { dir: "backwards", skip: firstParam.skip + firstPage.length };
            },
        });
        observer = o;
        latest = o.getCurrentResult();
        sub.next(latest);
        const unsubscribe = o.subscribe(r => { latest = r; sub.next(r); });
        return () => {
            unsubscribe();
            o.destroy();
            if (observer === o) {
                observer = null;
                latest = null;
            }
        };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    // One projection so buildItems runs once per emission and the sort-error reaches error$ reliably.
    const view$ = result$.pipe(
        map(r => {
            const built = buildItems(r.data?.pages, r.data?.pageParams);
            return {
                items: built.items,
                error: r.error ?? built.error,
                // `isPending`, not `isFetching`: loading$ tracks only the initial anchor load (no data
                // yet). Subsequent page fetches and invalidation-driven background refetches keep
                // `isFetching` true but `isPending` false — those surface through loadingForwards$/
                // loadingBackwards$ instead, so loading$ never flips over an already-populated list.
                loading: r.isPending,
                // Initial anchor load (pending + fetching, no directional flag) is reported as forwards.
                loadingForwards: r.isFetchingNextPage || (r.isFetching && r.isPending),
                loadingBackwards: r.isFetchingPreviousPage,
            };
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    return {
        items$: view$.pipe(map(v => v.items)),
        loading$: view$.pipe(map(v => v.loading), distinctUntilChanged()),
        loadingForwards$: view$.pipe(map(v => v.loadingForwards), distinctUntilChanged()),
        loadingBackwards$: view$.pipe(map(v => v.loadingBackwards), distinctUntilChanged()),
        error$: view$.pipe(map(v => v.error), distinctUntilChanged()),
        loadMore: (dir: PageDirection) => {
            if (!observer || !latest || latest.isPending)
                return; // wait for the first page before honouring pagination
            if (dir === "forwards")
                observer.fetchNextPage();
            else
                observer.fetchPreviousPage();
        },
        hasMore: (dir: PageDirection) => dir === "forwards" ? (latest?.hasNextPage ?? false) : (latest?.hasPreviousPage ?? false),
        refetch: () => { observer?.refetch(); },
    };
}
