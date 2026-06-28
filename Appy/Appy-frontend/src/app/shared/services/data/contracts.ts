import { Observable } from "rxjs";

/**
 * Public, library-agnostic data contracts the components depend on.
 *
 * These are the seam: today they are produced by the thin `query` / `pagedQuery`
 * helpers, but a real caching library (TanStack Query / Apollo / NgRx Entity / a
 * revived custom layer) could produce them later without any component churn.
 *
 * Observable-flavoured for Angular 16. When we move to signals, wrap with `toSignal`
 * at this surface — one place, no component changes.
 */

/** Result of a single fetch (one entity, or a full non-paged list). */
export interface QueryResult<T> {
    data$: Observable<T | undefined>;
    loading$: Observable<boolean>;
    error$: Observable<unknown>;
    refetch(): void;
}

export type PageDirection = "forwards" | "backwards";

/** Result of a bidirectional, infinitely-scrolling list (the list view). E is an optional per-page sidecar (e.g. time-offs). */
export interface PagedResult<T, E = never> {
    items$: Observable<T[]>;
    /** Per-page sidecar values, accumulated across loaded pages in the same order as items$. */
    extras$: Observable<E[]>;
    /**
     * `items` and `extras` from the same emission, paired. A consumer that needs both should
     * subscribe to this rather than combining `items$`/`extras$` — those are two projections of one
     * upstream, so `combineLatest` emits a transient `new-items` / `stale-extras` pair before the
     * consistent one. `page$` emits once per update, always consistent.
     */
    page$: Observable<{ items: T[]; extras: E[] }>;
    /** True while a page is loading in either direction. */
    loading$: Observable<boolean>;
    /** True while the next (forwards) page is loading — for the bottom spinner. */
    loadingForwards$: Observable<boolean>;
    /** True while the previous (backwards) page is loading — for the top spinner. */
    loadingBackwards$: Observable<boolean>;
    error$: Observable<unknown>;
    loadMore(dir: PageDirection): void;
    hasMore(dir: PageDirection): boolean;
    refetch(): void;
}
