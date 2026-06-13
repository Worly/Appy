import { BehaviorSubject, Observable, catchError, map, of, shareReplay, switchMap } from "rxjs";
import { QueryResult } from "./contracts";

/**
 * Builds a {@link QueryResult} around a single fetch.
 *
 * `refetch$` re-triggers the `switchMap`, and `shareReplay({ refCount: true })`
 * means multiple `| async` pipes (e.g. one on `data$`, one inside `*ngIf`) share
 * one in-flight request instead of double-fetching. No cache, no cross-view sharing —
 * the fetch re-runs whenever the result is re-subscribed from scratch or `refetch()`
 * is called. That deliberate "do nothing" is where a real cache would later live.
 */
export function query<T>(fetchFn: () => Observable<T>): QueryResult<T> {
    const refetch$ = new BehaviorSubject<void>(undefined);
    const loading$ = new BehaviorSubject<boolean>(false);
    const error$ = new BehaviorSubject<unknown>(undefined);

    const data$ = refetch$.pipe(
        switchMap(() => {
            loading$.next(true);
            error$.next(undefined);

            return fetchFn().pipe(
                map(data => {
                    loading$.next(false);
                    return data as T | undefined;
                }),
                catchError(err => {
                    error$.next(err);
                    loading$.next(false);
                    return of(undefined);
                })
            );
        }),
        shareReplay({ bufferSize: 1, refCount: true })
    );

    return {
        data$,
        loading$: loading$.asObservable(),
        error$: error$.asObservable(),
        refetch: () => refetch$.next()
    };
}
