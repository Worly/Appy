import { QueryClient, QueryObserver, QueryObserverResult } from "@tanstack/query-core";
import { Observable, distinctUntilChanged, firstValueFrom, map, shareReplay } from "rxjs";
import { CacheKey } from "./cache-coordinator";
import { QueryResult } from "./contracts";

/**
 * Builds a {@link QueryResult} backed by a TanStack {@link QueryObserver}.
 *
 * The observer is created and subscribed lazily on the first subscription to any of
 * data$/loading$/error$ (via shareReplay refCount), and destroyed when the last subscriber
 * leaves — so an unsubscribed QueryResult registers nothing with the cache, and unmounting a
 * component makes the query inactive and eligible for garbage collection. A route-reused
 * component that keeps its subscription alive across detach keeps the observer active, so
 * invalidation refetches it in the background.
 *
 * `fetchFn` (an Observable) is adapted to the Promise a queryFn must return via `firstValueFrom`.
 * `refetch()` is a no-op while nothing is subscribed (refetching an unobserved query is moot).
 */
export function query<T>(client: QueryClient, queryKey: CacheKey, fetchFn: () => Observable<T>): QueryResult<T> {
    let observer: QueryObserver<T, unknown, T, T> | null = null;

    const result$ = new Observable<QueryObserverResult<T, unknown>>(sub => {
        const o = new QueryObserver<T, unknown, T, T>(client, {
            queryKey: queryKey as unknown[],
            queryFn: () => firstValueFrom(fetchFn()),
        });
        observer = o;
        sub.next(o.getCurrentResult());
        const unsubscribe = o.subscribe(r => sub.next(r));
        return () => {
            unsubscribe();
            o.destroy();
            if (observer === o)
                observer = null;
        };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    return {
        data$: result$.pipe(map(r => r.data), distinctUntilChanged()),
        loading$: result$.pipe(map(r => r.isFetching), distinctUntilChanged()),
        error$: result$.pipe(map(r => r.error), distinctUntilChanged()),
        refetch: () => { observer?.refetch(); },
    };
}
