import { InfiniteData, InfiniteQueryObserver, InfiniteQueryObserverResult, QueryClient } from "@tanstack/query-core";
import { Observable, distinctUntilChanged, firstValueFrom, map, shareReplay } from "rxjs";
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
    /** Items per page. Defaults to 20. */
    pageSize?: number;
}

/**
 * Builds a {@link PagedResult}: a bidirectional, infinitely-scrolling list backed by a
 * TanStack {@link InfiniteQueryObserver}.
 *
 * `data.pages` is ordered [...backwards (earliest first), anchor, ...forwards (latest last)].
 * Backwards pages arrive descending, so each is reversed; the pages are then concatenated into
 * one buffer for `items$` in the order the backend returned them. Ordering and filtering are the
 * backend's responsibility — the seam doesn't re-sort or re-filter. The observer is created lazily
 * on first subscription and destroyed when the last subscriber leaves (mirrors `query()`).
 */
export function pagedQuery<T>(client: QueryClient, opts: PagedQueryOptions<T>): PagedResult<T> {
    const pageSize = opts.pageSize ?? 20;

    /** Flatten the fetched pages into one buffer for items$. Backwards pages arrive descending, so reverse them; everything else is taken as the backend returned it. */
    const buildItems = (pages: T[][] | undefined, pageParams: PageParam[] | undefined): T[] => {
        const data: T[] = [];
        if (pages == null || pageParams == null)
            return data;

        for (let i = 0; i < pages.length; i++) {
            const param = pageParams[i];
            // Backwards pages arrive descending (nearest-to-anchor first); reverse so the page is ascending.
            const ascending = param?.dir === "backwards" ? [...pages[i]].reverse() : pages[i];
            data.push(...ascending);
        }
        return data;
    };

    type Result = InfiniteQueryObserverResult<InfiniteData<T[], PageParam>, unknown>;
    let observer: InfiniteQueryObserver<T[], unknown, InfiniteData<T[], PageParam>, unknown[], PageParam> | null = null;
    let latest: Result | null = null;

    const result$ = new Observable<Result>(sub => {
        const o = new InfiniteQueryObserver<T[], unknown, InfiniteData<T[], PageParam>, unknown[], PageParam>(client, {
            queryKey: opts.queryKey as unknown[],
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

    // One projection so buildItems runs once per emission, shared by every derived stream.
    const view$ = result$.pipe(
        map(r => {
            return {
                items: buildItems(r.data?.pages, r.data?.pageParams),
                error: r.error,
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
            if (!observer)
                return;
            // Read fresh state straight off the observer (not the possibly-batched `latest`): a burst of
            // scroll events fires loadMore repeatedly, and fetchNextPage/fetchPreviousPage default to
            // cancelRefetch: true — without this guard each scroll cancels the in-flight page and restarts
            // it, sending one GET per scroll event. Bail while a page in that direction is already loading.
            const r = observer.getCurrentResult();
            if (r.isPending)
                return; // wait for the first page before honouring pagination
            if (dir === "forwards") {
                if (r.isFetchingNextPage || !r.hasNextPage)
                    return;
                observer.fetchNextPage();
            } else {
                if (r.isFetchingPreviousPage || !r.hasPreviousPage)
                    return;
                observer.fetchPreviousPage();
            }
        },
        hasMore: (dir: PageDirection) => dir === "forwards" ? (latest?.hasNextPage ?? false) : (latest?.hasPreviousPage ?? false),
        refetch: () => { observer?.refetch(); },
    };
}
