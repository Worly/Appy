import { InfiniteData, InfiniteQueryObserver, InfiniteQueryObserverResult, QueryClient } from "@tanstack/query-core";
import { Observable, distinctUntilChanged, firstValueFrom, map, shareReplay } from "rxjs";
import { CacheKey } from "./cache-coordinator";
import { PageDirection, PagedResult } from "./contracts";

interface CursorPageParam {
    dir: PageDirection;
    cursor: string;
}

/** One raw page: ascending `items`, optional `extra` sidecar, and the cursors that continue the list. */
export interface CursorPage<T, E> {
    items: T[];
    extra: E[];
    /** Fetch the next forwards page from here (Date >= nextCursor); null when nothing is ahead. */
    nextCursor: string | null;
    /** Fetch the next backwards page from here (Date < prevCursor); null when nothing is behind. */
    prevCursor: string | null;
}

export interface PagedQueryByCursorOptions<T, E> {
    /** TanStack cache key (include the params/filter that scope this list). */
    queryKey: CacheKey;
    /** Cursor for the first (forwards) page — the anchor date, "YYYY-MM-DD". */
    anchor: string;
    /** Fetch one page. Every page comes back ascending; direction only picks which days. */
    loadPage: (dir: PageDirection, cursor: string) => Observable<CursorPage<T, E>>;
}

/**
 * Builds a {@link PagedResult} backed by a cursor-paginated TanStack {@link InfiniteQueryObserver}.
 *
 * Every page is ascending, so `data.pages` concatenates directly — no per-page reversal. Forward
 * pagination (and TanStack's refetch reconstruction, which walks the whole chain forward via
 * getNextPageParam from the first page) always continues as a forwards fetch from the last page's
 * `nextCursor`; a backwards page's days are ascending too, so re-fetching it forwards yields the same
 * days. Backward pagination continues from the first page's `prevCursor`. Ordering/filtering are the
 * backend's job. The observer is lazily created on first subscription and destroyed on the last leave.
 */
export function pagedQueryByCursor<T, E = never>(client: QueryClient, opts: PagedQueryByCursorOptions<T, E>): PagedResult<T, E> {
    const flatten = <V>(pages: CursorPage<T, E>[] | undefined, pick: (p: CursorPage<T, E>) => V[]): V[] => {
        const data: V[] = [];
        if (pages == null)
            return data;
        for (const p of pages)
            data.push(...pick(p));
        return data;
    };

    type Result = InfiniteQueryObserverResult<InfiniteData<CursorPage<T, E>, CursorPageParam>, unknown>;
    let observer: InfiniteQueryObserver<CursorPage<T, E>, unknown, InfiniteData<CursorPage<T, E>, CursorPageParam>, unknown[], CursorPageParam> | null = null;
    let latest: Result | null = null;

    const result$ = new Observable<Result>(sub => {
        const o = new InfiniteQueryObserver<CursorPage<T, E>, unknown, InfiniteData<CursorPage<T, E>, CursorPageParam>, unknown[], CursorPageParam>(client, {
            queryKey: opts.queryKey as unknown[],
            queryFn: ({ pageParam }) => firstValueFrom(opts.loadPage(pageParam.dir, pageParam.cursor)),
            initialPageParam: { dir: "forwards", cursor: opts.anchor },
            getNextPageParam: lastPage => lastPage.nextCursor == null ? undefined : { dir: "forwards", cursor: lastPage.nextCursor },
            getPreviousPageParam: firstPage => firstPage.prevCursor == null ? undefined : { dir: "backwards", cursor: firstPage.prevCursor },
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

    const view$ = result$.pipe(
        map(r => ({
            items: flatten(r.data?.pages, p => p.items),
            extras: flatten(r.data?.pages, p => p.extra),
            error: r.error,
            loading: r.isPending,
            loadingForwards: r.isFetchingNextPage || (r.isFetching && r.isPending),
            loadingBackwards: r.isFetchingPreviousPage,
        })),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    return {
        items$: view$.pipe(map(v => v.items)),
        extras$: view$.pipe(map(v => v.extras)),
        page$: view$.pipe(map(v => ({ items: v.items, extras: v.extras }))),
        loading$: view$.pipe(map(v => v.loading), distinctUntilChanged()),
        loadingForwards$: view$.pipe(map(v => v.loadingForwards), distinctUntilChanged()),
        loadingBackwards$: view$.pipe(map(v => v.loadingBackwards), distinctUntilChanged()),
        error$: view$.pipe(map(v => v.error), distinctUntilChanged()),
        loadMore: (dir: PageDirection) => {
            if (!observer)
                return;
            const r = observer.getCurrentResult();
            if (r.isPending)
                return;
            // Wait out a full refetch (refetchOnMount / invalidation) — a directional fetch would cancel
            // it (cancelRefetch defaults true) and commit a stale snapshot.
            if (r.isFetching && !r.isFetchingNextPage && !r.isFetchingPreviousPage)
                return;
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
