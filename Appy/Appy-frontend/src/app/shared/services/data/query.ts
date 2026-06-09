import { QueryClient, QueryObserver } from "@tanstack/query-core";
import { Observable, distinctUntilChanged, firstValueFrom, map, shareReplay } from "rxjs";
import { CacheKey } from "./cache-coordinator";
import { QueryResult } from "./contracts";

/**
 * Builds a {@link QueryResult} backed by a TanStack {@link QueryObserver}.
 *
 * The observer is subscribed lazily (only while one of data$/loading$/error$ has a
 * subscriber, via shareReplay refCount) so unmounting a component makes the query inactive
 * and eligible for garbage collection. `fetchFn` (an Observable) is adapted to the Promise
 * a queryFn must return via `firstValueFrom`.
 */
export function query<T>(client: QueryClient, queryKey: CacheKey, fetchFn: () => Observable<T>): QueryResult<T> {
    const observer = new QueryObserver<T, unknown, T, T>(client, {
        queryKey: queryKey as unknown[],
        queryFn: () => firstValueFrom(fetchFn()),
    });

    const result$ = new Observable<import("@tanstack/query-core").QueryObserverResult<T, unknown>>(sub => {
        sub.next(observer.getCurrentResult());
        const unsubscribe = observer.subscribe(r => sub.next(r));
        return unsubscribe;
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    return {
        data$: result$.pipe(map(r => r.data), distinctUntilChanged()),
        loading$: result$.pipe(map(r => r.isFetching), distinctUntilChanged()),
        error$: result$.pipe(map(r => r.error), distinctUntilChanged()),
        refetch: () => { observer.refetch(); },
    };
}
