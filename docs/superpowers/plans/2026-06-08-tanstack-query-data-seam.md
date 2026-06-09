# TanStack Query Behind the Data Seam — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Back the existing Observable data seam (`query()` / `pagedQuery()` / `CacheCoordinator`) with TanStack Query (`@tanstack/query-core`), replacing all manual refetch code with mutation-driven `invalidateQueries`.

**Architecture:** The seam's public contracts (`QueryResult` / `PagedResult`) stay byte-for-byte the same; only their internals are rewritten to wrap a `QueryObserver` / `InfiniteQueryObserver` from `@tanstack/query-core`. A singleton `QueryClient` (provided in `AppModule`) holds the cache. `CacheCoordinator.invalidate()` gets a real body (`queryClient.invalidateQueries`). Components are untouched except to delete now-redundant manual `refetch()` / `ngBeforeAttach` code. A facility switch (or logout) clears both the query cache and the route-reuse component cache, closing the cross-tenant staleness hole that the deleted `ngBeforeAttach` refetch used to mask.

**Tech Stack:** Angular 16.1, RxJS 7.5, TypeScript 4.9, `@tanstack/query-core` v5, Karma + Jasmine (headless Chrome), Cypress.

**Working directory for all commands:** `Appy/Appy-frontend/`

---

## Critical TanStack-core facts the implementation depends on

Read these once — several tasks rely on them and they are easy to get wrong:

1. **`queryFn` must return a Promise and must NOT resolve `undefined`.** TanStack throws *"Query data cannot be undefined"* if a query function returns `undefined`. Our `fetchFn`s return `Observable<T>`; adapt with `firstValueFrom(fetchFn())`. The `getById` 404 path (currently `of(undefined)`) must therefore return `of(null)` and we map `null → undefined` at the seam boundary so the public contract is unchanged.
2. **Everything is async now.** A queryFn is a Promise, so results arrive on a later microtask/macrotask — not synchronously. Specs that previously asserted synchronously must `await flush()` (a `setTimeout(0)` flush helper) after subscribing or after triggering an action.
3. **A `QueryObserver` does not fetch until `.subscribe(listener)` is called** (constructing it does not fetch). `.subscribe()` returns an unsubscribe function. Snapshot the current state with `.getCurrentResult()`.
4. **`InfiniteQueryObserver`** result exposes `data.pages` (array of pages) and `data.pageParams` (aligned array of the param each page was fetched with), plus `fetchNextPage()`, `fetchPreviousPage()`, `hasNextPage`, `hasPreviousPage`, `isFetchingNextPage`, `isFetchingPreviousPage`, `isFetching`, `isPending`. `fetchNextPage` **appends** a page; `fetchPreviousPage` **prepends** a page. So `data.pages` is ordered `[...backwards (earliest first), anchor, ...forwards (latest last)]`.
5. **Invalidation refetches all loaded pages** of an infinite query (not just page 1). This is desired here.

---

## File Structure

**Modify (seam internals — public contracts unchanged):**
- `src/app/shared/services/data/query.ts` — wrap `QueryObserver`
- `src/app/shared/services/data/paged-query.ts` — wrap `InfiniteQueryObserver`
- `src/app/shared/services/data/cache-coordinator.ts` — real `invalidate()` + `clear()`
- `src/app/shared/services/base-model-service.ts` — pass read query keys; `getById` null-handling

**Modify (wiring):**
- `src/app/app.module.ts` — provide singleton `QueryClient`, mount it
- `src/app/pages/*/services/*.service.ts` — pass read keys when calling base read methods
- `src/app/services/route-reuse-strategy.ts` — add `clear()`
- `src/app/pages/facilities/services/facility.service.ts` — clear caches on `selectFacility`
- `src/app/shared/services/auth/auth.service.ts` — clear caches on `logOut`

**Modify (delete manual-refetch code):**
- `src/app/pages/clients/components/clients/clients.component.ts`
- `src/app/pages/services/components/services/services.component.ts`
- `src/app/pages/clients/components/client-lookup/client-lookup.component.ts`
- `src/app/pages/appointments/components/single-appointment/single-appointment.component.ts`

**Modify (tests):**
- `src/app/shared/services/data/query.spec.ts`
- `src/app/shared/services/data/paged-query.spec.ts`
- `src/app/shared/services/data/cache-coordinator.spec.ts`
- `src/app/services/route-reuse-strategy.spec.ts` (create if absent)

**Modify (docs):**
- `src/app/shared/CLAUDE.md`, `Appy-frontend/CLAUDE.md`, `src/app/services/CLAUDE.md`

---

## Task 1: Add `@tanstack/query-core` and provide a singleton QueryClient

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/app/app.module.ts`
- Create: `src/app/shared/services/data/query-client.ts`

- [ ] **Step 1: Install the dependency**

Run (from `Appy/Appy-frontend/`):
```bash
npm install @tanstack/query-core@5
```
Expected: `package.json` `dependencies` gains `"@tanstack/query-core": "^5.x.x"`.

- [ ] **Step 2: Verify TypeScript compatibility immediately**

Run:
```bash
npx ng build --configuration development
```
Expected: build succeeds. If it fails with a TypeScript-version error originating from `@tanstack/query-core`, downgrade within v5 until it builds (e.g. `npm install @tanstack/query-core@5.51.0`) and re-run. Do not proceed until the build is green.

- [ ] **Step 3: Create the QueryClient factory**

Create `src/app/shared/services/data/query-client.ts`:
```typescript
import { QueryClient } from "@tanstack/query-core";

/**
 * Single app-wide TanStack Query cache. Provided in AppModule and injected wherever
 * the data seam needs it (CacheCoordinator, BaseModelService).
 *
 * Defaults chosen to match the app's previous "stale is fine, refetch is cheap" behaviour:
 * - staleTime 0      → every fresh observer revalidates (instant cached paint, then refetch)
 * - retry false      → matches the old no-retry behaviour; keeps error toasts/tests immediate
 * - refetchOnWindowFocus false → predictable; this is not a live dashboard
 * - gcTime default (5 min) → route-reuse revisits get an instant cached paint
 */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 0,
                retry: false,
                refetchOnWindowFocus: false,
            },
        },
    });
}
```

- [ ] **Step 4: Provide and mount the QueryClient in AppModule**

In `src/app/app.module.ts`:
- Add imports near the other imports:
```typescript
import { QueryClient } from '@tanstack/query-core';
import { createQueryClient } from './shared/services/data/query-client';
```
- Add to the `providers` array (after the `RouteReuseStrategy` provider):
```typescript
    { provide: QueryClient, useFactory: createQueryClient },
    {
      provide: APP_INITIALIZER,
      useFactory: (queryClient: QueryClient) => () => queryClient.mount(),
      deps: [QueryClient],
      multi: true,
    },
```
(`APP_INITIALIZER` is already imported in this file.)

- [ ] **Step 5: Verify the build still passes**

Run:
```bash
npx ng build --configuration development
```
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/app/shared/services/data/query-client.ts src/app/app.module.ts
git commit -m "feat(data): add @tanstack/query-core and provide a singleton QueryClient"
```

---

## Task 2: Give CacheCoordinator a real `invalidate()` and a `clear()`

**Files:**
- Modify: `src/app/shared/services/data/cache-coordinator.ts`
- Test: `src/app/shared/services/data/cache-coordinator.spec.ts`

- [ ] **Step 1: Rewrite the failing spec**

Replace the entire contents of `src/app/shared/services/data/cache-coordinator.spec.ts`:
```typescript
import { QueryClient, QueryObserver } from "@tanstack/query-core";
import { CacheCoordinator } from "./cache-coordinator";
import { clientKeys } from "./keys";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));

describe("CacheCoordinator", () => {
    it("invalidate() refetches a live observer whose key matches (prefix match)", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const cache = new CacheCoordinator(client);

        let calls = 0;
        const observer = new QueryObserver(client, {
            queryKey: clientKeys.list(false) as unknown[],
            queryFn: async () => { calls++; return ++calls; },
            staleTime: Infinity, // so only invalidation (not staleness) can trigger a refetch
        });
        const unsub = observer.subscribe(() => { });
        await flush();
        expect(calls).toBeGreaterThan(0);
        const callsAfterFirst = calls;

        cache.invalidate(clientKeys.all); // prefix ["client"] matches ["client","list",false]
        await flush();

        expect(calls).toBeGreaterThan(callsAfterFirst);
        unsub();
    });

    it("clear() empties the cache", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const cache = new CacheCoordinator(client);

        const observer = new QueryObserver(client, {
            queryKey: clientKeys.list(false) as unknown[],
            queryFn: async () => 1,
            staleTime: Infinity,
        });
        const unsub = observer.subscribe(() => { });
        await flush();
        expect(client.getQueryCache().getAll().length).toBe(1);

        unsub();
        cache.clear();
        expect(client.getQueryCache().getAll().length).toBe(0);
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:
```bash
npx ng test --watch=false --include='**/cache-coordinator.spec.ts'
```
Expected: FAIL — `CacheCoordinator` constructor takes no `QueryClient` yet; `invalidate` is a no-op.

- [ ] **Step 3: Implement the real CacheCoordinator**

Replace the entire contents of `src/app/shared/services/data/cache-coordinator.ts`:
```typescript
import { Injectable } from "@angular/core";
import { QueryClient } from "@tanstack/query-core";

/** A hierarchical cache key, e.g. `['appointment', 'detail', 5]`. */
export type CacheKey = readonly unknown[];

/**
 * The seam's invalidation surface over the TanStack Query cache.
 *
 * Mutation sites call `invalidate(...mutationKeys)`; TanStack marks every matching query
 * stale (prefix match) and refetches the active ones in the background. `clear()` wipes the
 * whole cache — used as a hard tenant boundary on facility switch / logout.
 */
@Injectable({ providedIn: "root" })
export class CacheCoordinator {
    constructor(private client: QueryClient) { }

    invalidate(...keys: CacheKey[]): void {
        for (const key of keys)
            this.client.invalidateQueries({ queryKey: key as unknown[] });
    }

    clear(): void {
        this.client.clear();
    }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run:
```bash
npx ng test --watch=false --include='**/cache-coordinator.spec.ts'
```
Expected: PASS (2 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/services/data/cache-coordinator.ts src/app/shared/services/data/cache-coordinator.spec.ts
git commit -m "feat(data): CacheCoordinator invalidates and clears the TanStack cache"
```

---

## Task 3: Rewrite `query()` on a QueryObserver

**Files:**
- Modify: `src/app/shared/services/data/query.ts`
- Test: `src/app/shared/services/data/query.spec.ts`

- [ ] **Step 1: Rewrite the spec (RED)**

Replace the entire contents of `src/app/shared/services/data/query.spec.ts`:
```typescript
import { QueryClient } from "@tanstack/query-core";
import { Subject, of, throwError } from "rxjs";
import { query } from "./query";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const newClient = (staleTime = 0) =>
    new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } });

describe("query()", () => {
    it("does not call fetchFn until data$ is subscribed (lazy)", () => {
        const client = newClient();
        let calls = 0;
        const q = query(client, ["t", "lazy"], () => { calls++; return of(1); });

        expect(calls).toBe(0);

        q.data$.subscribe();
        expect(calls).toBe(1); // queryFn is invoked synchronously on subscribe
    });

    it("emits the fetched value on data$", async () => {
        const client = newClient();
        const q = query(client, ["t", "value"], () => of(42));

        const values: (number | undefined)[] = [];
        q.data$.subscribe(v => values.push(v));
        await flush();

        expect(values[values.length - 1]).toBe(42);
    });

    it("reports loading true while in flight and false once resolved", async () => {
        const client = newClient();
        const source = new Subject<number>();
        const q = query(client, ["t", "loading"], () => source);

        const loadings: boolean[] = [];
        q.loading$.subscribe(l => loadings.push(l));
        q.data$.subscribe();
        await flush();

        expect(loadings[loadings.length - 1]).toBe(true);

        source.next(7);
        source.complete();
        await flush();

        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("shares a single in-flight fetch across multiple data$ subscribers", () => {
        const client = newClient();
        let calls = 0;
        const source = new Subject<number>();
        const q = query(client, ["t", "share"], () => { calls++; return source; });

        q.data$.subscribe();
        q.data$.subscribe();

        expect(calls).toBe(1);
    });

    it("serves a cached value to a second same-key query without refetching", async () => {
        const client = newClient(Infinity); // fresh forever → no revalidation
        let calls = 0;
        const q1 = query(client, ["t", "cache"], () => { calls++; return of(99); });
        q1.data$.subscribe();
        await flush();
        expect(calls).toBe(1);

        const q2 = query(client, ["t", "cache"], () => { calls++; return of(99); });
        const values: (number | undefined)[] = [];
        q2.data$.subscribe(v => values.push(v));
        await flush();

        expect(values[values.length - 1]).toBe(99);
        expect(calls).toBe(1); // second observer read from cache, did not refetch
    });

    it("re-runs fetchFn on refetch()", async () => {
        const client = newClient();
        let calls = 0;
        const q = query(client, ["t", "refetch"], () => { calls++; return of(calls); });

        const values: (number | undefined)[] = [];
        q.data$.subscribe(v => values.push(v));
        await flush();
        expect(values[values.length - 1]).toBe(1);

        q.refetch();
        await flush();
        expect(values[values.length - 1]).toBe(2);
    });

    it("emits the error on error$ and clears loading", async () => {
        const client = newClient();
        const q = query(client, ["t", "error"], () => throwError(() => new Error("boom")));

        const errors: unknown[] = [];
        const loadings: boolean[] = [];
        q.error$.subscribe(e => errors.push(e));
        q.loading$.subscribe(l => loadings.push(l));
        q.data$.subscribe();
        await flush();

        expect((errors[errors.length - 1] as Error)?.message).toBe("boom");
        expect(loadings[loadings.length - 1]).toBe(false);
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:
```bash
npx ng test --watch=false --include='**/query.spec.ts'
```
Expected: FAIL — `query()` does not accept `(client, key, fetchFn)` yet.

- [ ] **Step 3: Implement the new `query()`**

Replace the entire contents of `src/app/shared/services/data/query.ts`:
```typescript
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
    const observer = new QueryObserver<T, unknown, T, T, unknown[]>(client, {
        queryKey: queryKey as unknown[],
        queryFn: () => firstValueFrom(fetchFn()),
    });

    const result$ = new Observable<{ data?: T; isFetching: boolean; error: unknown }>(sub => {
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
```

- [ ] **Step 4: Run the spec to verify it passes**

Run:
```bash
npx ng test --watch=false --include='**/query.spec.ts'
```
Expected: PASS (7 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/services/data/query.ts src/app/shared/services/data/query.spec.ts
git commit -m "feat(data): back query() with a TanStack QueryObserver"
```

---

## Task 4: Rewrite `pagedQuery()` on an InfiniteQueryObserver

**Files:**
- Modify: `src/app/shared/services/data/paged-query.ts`
- Test: `src/app/shared/services/data/paged-query.spec.ts`

> Behaviour note carried into this task: `pagedQuery().refetch()` now refreshes **all loaded pages in place** (TanStack semantics) instead of resetting to the anchor. No component relies on the old reset-to-anchor behaviour (the list view recreates the paged query on date/filter change via `load()`, not via `refetch()`), so the relevant spec is updated to the new semantics.

- [ ] **Step 1: Rewrite the spec (RED)**

Replace the entire contents of `src/app/shared/services/data/paged-query.spec.ts`:
```typescript
import { QueryClient } from "@tanstack/query-core";
import { Subject, of, throwError } from "rxjs";
import { pagedQuery } from "./paged-query";
import { PageDirection } from "./contracts";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const asc = (a: number, b: number) => a - b;
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Builds a loadPage that slices fixed forwards/backwards datasets by skip/take. */
function dataset(forwards: number[], backwards: number[] = []) {
    return (dir: PageDirection, skip: number, take: number) =>
        of((dir === "forwards" ? forwards : backwards).slice(skip, skip + take));
}

function lastEmission<T>(emissions: T[][]): T[] {
    return emissions[emissions.length - 1];
}

describe("pagedQuery()", () => {
    it("loads the first forwards page on subscription and emits it sorted", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 1], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();

        expect(lastEmission(emissions)).toEqual([10, 11]);
    });

    it("appends the next page on loadMore('forwards')", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 2], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();

        pq.loadMore("forwards");
        await flush();

        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
    });

    it("prepends earlier items on loadMore('backwards'), keeping the buffer globally sorted", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 3], loadPage: dataset([10, 11], [9, 8, 7, 6]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();

        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);

        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([6, 7, 8, 9, 10, 11]);
    });

    it("reports hasMore false once a partial page is returned", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 4], loadPage: dataset([10, 11, 12]), sort: asc, pageSize: 2 });

        pq.items$.subscribe();
        await flush();
        expect(pq.hasMore("forwards")).toBe(true);

        pq.loadMore("forwards"); // returns [12] — a partial page
        await flush();
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("drops filtered items from the buffer but still advances the backend skip", async () => {
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 5],
            loadPage: dataset([10, 11, 12, 13]),
            sort: asc,
            pageSize: 2,
            filter: n => n % 2 === 0,
        });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10]); // 11 filtered out of page [10,11]

        pq.loadMore("forwards"); // page [12,13] — skip advanced past 11, not re-fetched
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 12]);
    });

    it("reports loading true while a page is in flight and false once it resolves", async () => {
        const source = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 6], loadPage: () => source, sort: asc, pageSize: 2 });

        const loadings: boolean[] = [];
        pq.loading$.subscribe(l => loadings.push(l));
        pq.items$.subscribe();
        await flush();
        expect(loadings[loadings.length - 1]).toBe(true);

        source.next([1, 2]);
        source.complete();
        await flush();
        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("reports loadingForwards$ for the initial forwards page", async () => {
        const source = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 7], loadPage: () => source, sort: asc, pageSize: 2 });

        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);
        pq.items$.subscribe();
        await flush();

        expect(fwd).toBe(true); // initial anchor load is reported as forwards
        expect(bwd).toBe(false);

        source.next([1, 2]);
        source.complete();
        await flush();
        expect(fwd).toBe(false);
        expect(bwd).toBe(false);
    });

    it("reports loadingBackwards$ for the in-flight backwards page only", async () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 8],
            loadPage: (dir: PageDirection) => dir === "forwards" ? fwdSource : bwdSource,
            sort: asc,
            pageSize: 2,
        });

        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);
        pq.items$.subscribe();
        await flush();

        fwdSource.next([10, 11]); // finish initial forwards load so loadMore is honoured
        fwdSource.complete();
        await flush();
        expect(fwd).toBe(false);

        pq.loadMore("backwards");
        await flush();
        expect(bwd).toBe(true);
        expect(fwd).toBe(false);

        bwdSource.next([9, 8]);
        bwdSource.complete();
        await flush();
        expect(bwd).toBe(false);
    });

    it("keeps loading$ true while either direction is loading", async () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 9],
            loadPage: (dir: PageDirection) => dir === "forwards" ? fwdSource : bwdSource,
            sort: asc,
            pageSize: 2,
        });

        let loading = false;
        pq.loading$.subscribe(l => loading = l);
        pq.items$.subscribe();
        await flush();

        fwdSource.next([10, 11]);
        fwdSource.complete();
        await flush();
        expect(loading).toBe(false);

        pq.loadMore("backwards");
        await flush();
        expect(loading).toBe(true);

        bwdSource.next([9, 8]);
        bwdSource.complete();
        await flush();
        expect(loading).toBe(false);
    });

    it("refetch() refreshes all loaded pages in place", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 10], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();

        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);

        pq.refetch();
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]); // both pages kept & refreshed
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("emits the error on error$ when a page fails", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 11], loadPage: () => throwError(() => new Error("nope")), sort: asc });

        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));
        pq.items$.subscribe();
        await flush();

        expect((errors[errors.length - 1] as Error)?.message).toBe("nope");
    });

    it("surfaces an error when a page is not sorted per the sort predicate", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 12], loadPage: dataset([2, 1]), sort: asc, pageSize: 2 });

        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));
        pq.items$.subscribe();
        await flush();

        expect(errors[errors.length - 1]).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:
```bash
npx ng test --watch=false --include='**/paged-query.spec.ts'
```
Expected: FAIL — `pagedQuery()` does not accept `(client, opts)` with `queryKey` yet.

- [ ] **Step 3: Implement the new `pagedQuery()`**

Replace the entire contents of `src/app/shared/services/data/paged-query.ts`:
```typescript
import { InfiniteQueryObserver, QueryClient } from "@tanstack/query-core";
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
 * filtered, and sorted-inserted into one globally-sorted buffer for `items$`.
 */
export function pagedQuery<T>(client: QueryClient, opts: PagedQueryOptions<T>): PagedResult<T> {
    const pageSize = opts.pageSize ?? 20;
    const passesFilter = opts.filter ?? (() => true);

    const observer = new InfiniteQueryObserver<T[], unknown, T[], T[], unknown[], PageParam>(client, {
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

    let buildError: unknown = undefined;

    /** Flatten pages into one globally-sorted, filtered buffer (the old PageableListDatasource merge). */
    const buildItems = (pages: T[][] | undefined, pageParams: PageParam[] | undefined): T[] => {
        buildError = undefined;
        const data: T[] = [];
        if (pages == null || pageParams == null)
            return data;

        for (let i = 0; i < pages.length; i++) {
            const param = pageParams[i];
            // Backwards pages arrive descending; reverse so the page is ascending.
            const ascending = param?.dir === "backwards" ? [...pages[i]].reverse() : pages[i];

            if (!isSorted(ascending, opts.sort)) {
                buildError = new Error("Received page is not correctly sorted. Check if backend sort matches frontend sort!");
                return [];
            }

            for (const item of ascending) {
                if (!passesFilter(item))
                    continue;
                data.splice(getInsertIndex(data, item, opts.sort), 0, item);
            }
        }
        return data;
    };

    let latest = observer.getCurrentResult();

    const result$ = new Observable<typeof latest>(sub => {
        sub.next(observer.getCurrentResult());
        const unsubscribe = observer.subscribe(r => { latest = r; sub.next(r); });
        return unsubscribe;
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    // Initial anchor load reports as a forwards load (status pending + fetching, no directional flag yet).
    const isInitialLoading = (r: typeof latest) => r.isFetching && r.isPending;

    return {
        items$: result$.pipe(
            map(r => buildItems(r.data?.pages, r.data?.pageParams as PageParam[] | undefined)),
        ),
        loading$: result$.pipe(map(r => r.isFetching), distinctUntilChanged()),
        loadingForwards$: result$.pipe(map(r => r.isFetchingNextPage || isInitialLoading(r)), distinctUntilChanged()),
        loadingBackwards$: result$.pipe(map(r => r.isFetchingPreviousPage), distinctUntilChanged()),
        error$: result$.pipe(map(r => r.error ?? buildError), distinctUntilChanged()),
        loadMore: (dir: PageDirection) => {
            if (latest.isPending) return; // wait for the first page before honouring pagination
            if (dir === "forwards") latest.fetchNextPage();
            else latest.fetchPreviousPage();
        },
        hasMore: (dir: PageDirection) => dir === "forwards" ? (latest.hasNextPage ?? false) : (latest.hasPreviousPage ?? false),
        refetch: () => { observer.refetch(); },
    };
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run:
```bash
npx ng test --watch=false --include='**/paged-query.spec.ts'
```
Expected: PASS (13 specs). If the `error$` "not sorted" spec or the "page fails" spec flakes on ordering, confirm `buildError` is read after `r.error` in the `error$` map — both are covered by the `?? buildError` fallback.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/services/data/paged-query.ts src/app/shared/services/data/paged-query.spec.ts
git commit -m "feat(data): back pagedQuery() with a TanStack InfiniteQueryObserver"
```

---

## Task 5: Wire read keys through BaseModelService and feature services

**Files:**
- Modify: `src/app/shared/services/base-model-service.ts`
- Modify: `src/app/pages/appointments/services/appointment.service.ts`
- Modify: `src/app/pages/clients/services/client.service.ts`
- Modify: `src/app/pages/services/services/service.service.ts`
- Modify: `src/app/pages/working-hours/services/working-hours.service.ts`

> No new unit spec here (these are thin DI wiring changes over already-tested helpers); verified by the build + the full suite in Task 9. TDD coverage of the seam behaviour lives in Tasks 2–4.

- [ ] **Step 1: Update BaseModelService to inject the QueryClient and take read keys**

In `src/app/shared/services/base-model-service.ts`:

Add the import:
```typescript
import { QueryClient } from "@tanstack/query-core";
import { CacheKey } from "./data/cache-coordinator";
```
(`CacheCoordinator` is already imported; keep that import and add `CacheKey` if not already present — it is currently imported together, so just ensure `QueryClient` is added.)

Add a field and resolve it in the constructor (alongside `this.cache`):
```typescript
    protected queryClient: QueryClient;
```
```typescript
        this.cache = this.injector.get(CacheCoordinator);
        this.queryClient = this.injector.get(QueryClient);
```

Change the read methods to take an explicit `queryKey` and pass it + the client into the helpers:

```typescript
    public getAll(): QueryResult<vT[]> {
        return this.getAllAdvanced(this.allListKey(), null);
    }

    public getAllAdvanced(queryKey: CacheKey, params: any): QueryResult<vT[]> {
        return query(this.queryClient, queryKey, () =>
            this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getAll`, { params })
                .pipe(map(r => r.map(o => new this.viewTypeFactory(o)))));
    }

    public getListAdvanced(queryKey: CacheKey, params: any, sortPredicate: (a: vT, b: vT) => number, filter?: SmartFilter, filterPredicate?: (e: vT) => boolean): PagedResult<vT> {
        let loadPage = (dir: "forwards" | "backwards", skip: number, take: number): Observable<vT[]> => {
            let p = { ...params, direction: dir, skip: skip, take: take };
            if (filter != null)
                p.filter = JSON.stringify(filter);
            return this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getList`, { params: p })
                .pipe(map(r => r.map(o => new this.viewTypeFactory(o))));
        };

        let filterFunc = (e: vT) => (filter == null || applySmartFilter(e, filter)) && (filterPredicate == null || filterPredicate(e));

        return pagedQuery<vT>(this.queryClient, { queryKey, loadPage, sort: sortPredicate, filter: filterFunc });
    }
```

Add a protected hook the subclasses override to supply the "all/list" key for the default `getAll()` (default uses the entity's `all` key; subclasses that override `getAll` ignore it):
```typescript
    /** Key for the default getAll() list fetch. Subclasses with a discriminator (archived/date) override getAll() and pass a list(...) key instead. */
    protected allListKey(): CacheKey {
        return this.mutationKeys[0] ?? [];
    }
```

Change `getById` to take a key and return the not-found path as `null` internally, mapped back to `undefined` so the public contract is unchanged:
```typescript
    /** Single-entity fetch. `data$` emits `undefined` when the entity is not found (404). */
    public getById(queryKey: CacheKey, id: any): QueryResult<vT | undefined> {
        const q = query<vT | null>(this.queryClient, queryKey, () =>
            this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`, {
                context: new HttpContext().set(IGNORE_NOT_FOUND, true)
            }).pipe(
                map(s => new this.viewTypeFactory(s) as vT),
                catchError(e => {
                    if (e instanceof HttpErrorResponse && e.status == 404)
                        return of(null); // TanStack queryFn must not resolve `undefined`
                    return throwError(() => e);
                })));

        return {
            data$: q.data$.pipe(map(d => d ?? undefined)),
            loading$: q.loading$,
            error$: q.error$,
            refetch: q.refetch,
        };
    }
```
(Add `map` to the rxjs import in this file if not already present — it is.)

- [ ] **Step 2: Update the feature services to pass keys**

`src/app/pages/appointments/services/appointment.service.ts` — update the `getAll` override and `getList`:
```typescript
    public override getAll(date?: Dayjs): QueryResult<AppointmentView[]> {
        if (date == null)
            throw "Date cannot be null";

        return this.getAllAdvanced(appointmentKeys.list(date.format("YYYY-MM-DD")), {
            date: date.format("YYYY-MM-DD")
        });
    }

    public getList(date: Dayjs, filter: SmartFilter | undefined, sortPredicate: (a: AppointmentView, b: AppointmentView) => number): PagedResult<AppointmentView> {
        return this.getListAdvanced(
            [...appointmentKeys.list(date.format("YYYY-MM-DD")), filter ? JSON.stringify(filter) : "all"],
            { date: date.format("YYYY-MM-DD") }, sortPredicate, filter);
    }
```

`src/app/pages/clients/services/client.service.ts` — update `getAll`:
```typescript
    public override getAll(archived?: boolean): QueryResult<Client[]> {
        return this.getAllAdvanced(clientKeys.list(!!archived), {
            archived: !!archived
        });
    }
```

`src/app/pages/services/services/service.service.ts` — update `getAll`:
```typescript
    public override getAll(archived?: boolean): QueryResult<Service[]> {
        return this.getAllAdvanced(serviceKeys.list(!!archived), {
            archived: !!archived
        });
    }
```

`src/app/pages/working-hours/services/working-hours.service.ts` — `WorkingHoursService` does not override `getAll`; the inherited `getAll()` will use `allListKey()` → `workingHourKeys.all`. No change needed unless it calls `getAll` with params; it does not. Leave as-is.

- [ ] **Step 3: Update the two `getById` call sites to pass keys**

`src/app/pages/appointments/components/single-appointment/single-appointment.component.ts` — in `setDatasource`:
```typescript
    this.datasourceSub = this.appointmentService.getById(appointmentKeys.detail(id), id).data$.subscribe(a => {
      this.appointment = a;
      this.isLoading = false;
    });
```
Add the import:
```typescript
import { appointmentKeys } from 'src/app/shared/services/data/keys';
```

`src/app/pages/clients/components/client-lookup/client-lookup.component.ts` — in `setDatasource`:
```typescript
      this.datasourceSub = this.clientService.getById(clientKeys.detail(client.id), client.id).data$.subscribe(c => {
        this.clientChanged(c?.getDTO());
      });
```
Add the import:
```typescript
import { clientKeys } from 'src/app/shared/services/data/keys';
```

- [ ] **Step 4: Verify the build passes**

Run:
```bash
npx ng build --configuration development
```
Expected: build succeeds (no type errors). If a `getById`/`getAllAdvanced` call site elsewhere breaks, update it to pass the entity's key (search with `grep -rn "getById\|getAllAdvanced" src`).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/services/base-model-service.ts src/app/pages/appointments/services/appointment.service.ts src/app/pages/clients/services/client.service.ts src/app/pages/services/services/service.service.ts src/app/pages/appointments/components/single-appointment/single-appointment.component.ts src/app/pages/clients/components/client-lookup/client-lookup.component.ts
git commit -m "feat(data): wire entity read keys through the seam for cache identity + invalidation"
```

---

## Task 6: Delete the manual-refetch code

**Files:**
- Modify: `src/app/pages/clients/components/clients/clients.component.ts`
- Modify: `src/app/pages/services/components/services/services.component.ts`
- Modify: `src/app/pages/clients/components/client-lookup/client-lookup.component.ts`
- Modify: `src/app/pages/appointments/components/single-appointment/single-appointment.component.ts`

- [ ] **Step 1: Remove `ngBeforeAttach` refetch from ClientsComponent**

In `src/app/pages/clients/components/clients/clients.component.ts`:
- Remove `BeforeAttach` from the `implements` clause (leave `OnInit, OnDestroy`).
- Delete the import `import { BeforeAttach } from 'src/app/services/attach-detach-hooks.service';`.
- Delete the entire `ngBeforeAttach()` method and its leading comment block.

The `clientsQuery` field and `load()` stay (the query observer stays subscribed across detach, so invalidation refreshes it in the background).

- [ ] **Step 2: Remove `ngBeforeAttach` refetch from ServicesComponent**

Apply the identical change in `src/app/pages/services/components/services/services.component.ts` (remove `BeforeAttach`, its import, and the `ngBeforeAttach()` method + comment).

- [ ] **Step 3: Remove the post-add refetch in ClientLookupComponent**

In `src/app/pages/clients/components/client-lookup/client-lookup.component.ts`, inside `addNew()`'s success handler, delete:
```typescript
        // No live datasource any more: refetch so the new client appears in the dropdown list.
        this.listQuery?.refetch();
```
The `clientKeys.all` invalidation fired by `addNew()` (via `CacheCoordinator`) now refreshes the live list query automatically. Keep the `listQuery` field and its subscription in `load()` (it is the live observer that invalidation refreshes).

- [ ] **Step 4: Remove the manual response-assignment in SingleAppointmentComponent**

In `src/app/pages/appointments/components/single-appointment/single-appointment.component.ts`, change `onChangeStatus` so it no longer hand-updates `this.appointment` from the mutation response — the live `getById` observer re-emits after `appointmentKeys.all` invalidation:
```typescript
  onChangeStatus(newStatus: AppointmentStatus) {
    if (this.appointment == null)
      return;

    this.isLoadingStatusChange = true;
    this.subs.push(this.appointmentService.setStatus(this.appointment.id, newStatus).subscribe({
      next: () => this.isLoadingStatusChange = false,
      error: () => this.isLoadingStatusChange = false
    }));
  }
```

- [ ] **Step 5: Verify the build passes**

Run:
```bash
npx ng build --configuration development
```
Expected: build succeeds. If TypeScript flags an unused import (`QueryResult`) in either list component, leave it if still used by the `*Query` field type; otherwise remove it.

- [ ] **Step 6: Commit**

```bash
git add src/app/pages/clients/components/clients/clients.component.ts src/app/pages/services/components/services/services.component.ts src/app/pages/clients/components/client-lookup/client-lookup.component.ts src/app/pages/appointments/components/single-appointment/single-appointment.component.ts
git commit -m "refactor: drop manual refetch/response-sync in favour of TanStack invalidation"
```

---

## Task 7: Tenant isolation — clear both caches on facility switch and logout

**Files:**
- Modify: `src/app/services/route-reuse-strategy.ts`
- Create: `src/app/services/route-reuse-strategy.spec.ts`
- Modify: `src/app/pages/facilities/services/facility.service.ts`
- Modify: `src/app/shared/services/auth/auth.service.ts`

- [ ] **Step 1: Write the failing spec for `CustomReuseStrategy.clear()`**

Create `src/app/services/route-reuse-strategy.spec.ts`:
```typescript
import { CustomReuseStrategy } from "./route-reuse-strategy";

describe("CustomReuseStrategy.clear()", () => {
    it("destroys every stored handle and empties the handlers map", () => {
        const strategy = new CustomReuseStrategy();

        let destroyedA = 0, destroyedB = 0;
        strategy.handlers = {
            clients: { "": { componentRef: { destroy: () => destroyedA++ } } as any },
            services: { "": { componentRef: { destroy: () => destroyedB++ } } as any },
        };

        strategy.clear();

        expect(destroyedA).toBe(1);
        expect(destroyedB).toBe(1);
        expect(Object.keys(strategy.handlers).length).toBe(0);
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run:
```bash
npx ng test --watch=false --include='**/route-reuse-strategy.spec.ts'
```
Expected: FAIL — `clear()` does not exist.

- [ ] **Step 3: Add `clear()` to CustomReuseStrategy**

In `src/app/services/route-reuse-strategy.ts`, add this method inside the class (e.g. after `shouldReuseRoute`):
```typescript
    /** Destroy all cached (detached) components and forget them. Used as a hard tenant boundary on facility switch / logout. */
    clear(): void {
        for (let gr in this.handlers) {
            for (let key in this.handlers[gr])
                (this.handlers[gr][key] as any).componentRef.destroy();
        }
        this.handlers = {};
    }
```

- [ ] **Step 4: Run the spec to verify it passes**

Run:
```bash
npx ng test --watch=false --include='**/route-reuse-strategy.spec.ts'
```
Expected: PASS.

- [ ] **Step 5: Clear caches on facility switch**

In `src/app/pages/facilities/services/facility.service.ts`:

Add imports:
```typescript
import { RouteReuseStrategy } from "@angular/router";
import { CacheCoordinator } from "src/app/shared/services/data/cache-coordinator";
import { CustomReuseStrategy } from "src/app/services/route-reuse-strategy";
```
Inject them:
```typescript
    constructor(
        private http: HttpClient,
        private cache: CacheCoordinator,
        private reuseStrategy: RouteReuseStrategy,
    ) { }
```
Update `selectFacility` to wipe both caches after the new facility id is set:
```typescript
    public selectFacility(facility: Facility): Observable<void> {
        return this.http.put<void>(appConfig.apiUrl + "facility/selectFacility", facility.id)
            .pipe(tap(() => {
                this.selectedFacilityId = facility.id;
                this.cache.clear();
                (this.reuseStrategy as CustomReuseStrategy).clear();
            }));
    }
```

- [ ] **Step 6: Clear caches on logout**

In `src/app/shared/services/auth/auth.service.ts`:

Add imports:
```typescript
import { RouteReuseStrategy } from "@angular/router";
import { CacheCoordinator } from "src/app/shared/services/data/cache-coordinator";
import { CustomReuseStrategy } from "src/app/services/route-reuse-strategy";
```
Add to the constructor params:
```typescript
    constructor(
        private router: Router,
        private httpClient: HttpClient,
        private facilityService: FacilityService,
        private cache: CacheCoordinator,
        private reuseStrategy: RouteReuseStrategy,
    ) { }
```
In `logOut()`, after `this.facilityService.clear();` and before `this.router.navigate(["login"]);`, add:
```typescript
        this.cache.clear();
        (this.reuseStrategy as CustomReuseStrategy).clear();
```

- [ ] **Step 7: Verify the build passes**

Run:
```bash
npx ng build --configuration development
```
Expected: build succeeds. If Angular reports a DI cycle, confirm `FacilityService` and `AuthService` do not inject each other (they do not today) — the new deps are `CacheCoordinator` (→ `QueryClient`, no app-service deps) and `RouteReuseStrategy` (no deps).

- [ ] **Step 8: Commit**

```bash
git add src/app/services/route-reuse-strategy.ts src/app/services/route-reuse-strategy.spec.ts src/app/pages/facilities/services/facility.service.ts src/app/shared/services/auth/auth.service.ts
git commit -m "feat: clear query + route-reuse caches on facility switch and logout (tenant isolation)"
```

---

## Task 8: Update CLAUDE.md documentation

**Files:**
- Modify: `src/app/shared/CLAUDE.md`
- Modify: `Appy-frontend/CLAUDE.md` (i.e. `src/../CLAUDE.md` at the frontend root)
- Modify: `src/app/services/CLAUDE.md`

- [ ] **Step 1: Update `src/app/shared/CLAUDE.md` — Data Seam section**

Rewrite the "Data Seam" intro and the per-file bullets to reflect reality:
- Intro: the seam is now **backed by TanStack Query (`@tanstack/query-core`)** — a real client-side cache. The contracts are unchanged; a different library could still be swapped behind them.
- `query(client, key, fetchFn)`: wraps a `QueryObserver`; lazily subscribed via `shareReplay` refCount; `fetchFn` Observable adapted to the queryFn Promise via `firstValueFrom`.
- `pagedQuery(client, opts)`: wraps an `InfiniteQueryObserver`; `data.pages` flattened/oriented/filtered/sorted into `items$`; `refetch()` refreshes all loaded pages.
- `CacheCoordinator`: `invalidate(...keys)` → `queryClient.invalidateQueries` (prefix match); `clear()` → `queryClient.clear()` (tenant reset).
- Key factories: now the **live query keys**, not just a vocabulary. `getById` → `detail(id)`, `getAll` → `list(...)`, paged list → `list(date)` + serialized filter.
- Update the `BaseModelService` bullet: `getById(key, id)` / `getAllAdvanced(key, params)` / `getListAdvanced(key, …)` take an explicit query key supplied by the feature service.

- [ ] **Step 2: Update `Appy-frontend/CLAUDE.md` — State Management section**

Replace the paragraph under "State Management" item 1 with: state flows through the data seam, now backed by a real TanStack Query cache; mutations call `CacheCoordinator.invalidate(...mutationKeys)` and matching active queries refetch automatically (no manual refetch, no live-sync bus). A facility switch / logout calls `queryClient.clear()` + `CustomReuseStrategy.clear()` as a hard tenant boundary. Remove the "data allowed to go stale / refetch on `ngBeforeAttach`" wording.

- [ ] **Step 3: Update `src/app/services/CLAUDE.md` — RouteReuseStrategy section**

- Remove the sentence stating the cached clients/services lists implement `ngBeforeAttach` to refetch in place.
- Add: `CustomReuseStrategy` exposes `clear()` (destroys all cached components); called on facility switch / logout so a new tenant never sees the previous tenant's cached list components. Cached lists now refresh via TanStack invalidation while detached, so no `ngBeforeAttach` refetch is needed.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/CLAUDE.md CLAUDE.md src/app/services/CLAUDE.md
git commit -m "docs: update CLAUDE.md for the TanStack-backed data seam"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run:
```bash
npx ng test --watch=false
```
Expected: all specs pass (the 23 data specs as rewritten + the new route-reuse spec + all pre-existing specs). Investigate and fix any failure before continuing — do not skip.

- [ ] **Step 2: Production build**

Run:
```bash
npx ng build
```
Expected: build succeeds with no errors.

- [ ] **Step 3: Start backend + frontend for E2E**

Backend and Postgres are always available locally (see `.claude/CLAUDE.md`). Start the backend and the frontend dev server (each in the background):
```bash
# from repo root
dotnet run --project Appy
# from Appy/Appy-frontend/
npx ng serve
```
Wait until the backend logs "Application started" (https://localhost:5001) and the frontend serves http://localhost:4200.

- [ ] **Step 4: Run Cypress E2E (background — takes 2–6 min)**

Run with `run_in_background: true` (per `.claude/CLAUDE.md`), from `Appy/Appy-frontend/`:
```bash
npx cypress run
```
Expected: all E2E specs pass — especially the appointments **list infinite-scroll** (forwards + backwards) and the **status-revert** specs, which are the integration check for the infinite query + invalidation. Investigate any failure.

- [ ] **Step 5: Manual validation via Playwright MCP (invalidation paths E2E doesn't cover)**

Verify by hand in the browser at http://localhost:4200:
1. Edit a client's name → return to the clients list → the list shows the new name **without** a manual reload, and **scroll position is preserved**.
2. Confirm/unconfirm an appointment from the detail panel → its status updates in place.
3. Switch facility → the previous facility's clients/services do not appear (cold, correct load for the new tenant).

- [ ] **Step 6: Commit any fixes**

If Steps 1–5 required fixes, commit them with a descriptive message. Otherwise nothing to commit.

---

## Done criteria

- All unit specs green; prod build green; Cypress E2E green; the three manual invalidation checks pass.
- No remaining manual `refetch()` / `ngBeforeAttach` refetch code (grep `grep -rn "ngBeforeAttach\|\.refetch()" src/app/pages` returns only legitimate uses, if any).
- `docs/superpowers/` will be removed from the branch before the PR is opened (handled at PR time per project convention; not part of these tasks).

---

## Self-review (filled in by the plan author)

**Spec coverage:** Dependency + QueryClient (Task 1) ✓; `invalidate`/`clear` (Task 2) ✓; `query()` on QueryObserver (Task 3) ✓; `pagedQuery()` on InfiniteQueryObserver (Task 4) ✓; read-key wiring incl. `getById` null-handling (Task 5) ✓; manual-refetch deletions (Task 6) ✓; tenant isolation = `CustomReuseStrategy.clear()` + `queryClient.clear()` on switch/logout (Task 7) ✓; defaults staleTime 0 / retry false / refetchOnWindowFocus false (Task 1, Step 3) ✓; docs (Task 8) ✓; TDD specs + E2E + build (Tasks 2–4, 9) ✓; scroller explicitly out of scope (intro + #131) ✓.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; commands have expected output.

**Type consistency:** `query(client, queryKey, fetchFn)`, `pagedQuery(client, opts)` with `opts.queryKey`, `CacheCoordinator(client)` with `invalidate(...keys)` / `clear()`, `CustomReuseStrategy.clear()`, `getById(queryKey, id)` / `getAllAdvanced(queryKey, params)` / `getListAdvanced(queryKey, params, …)` — names/signatures match across Tasks 2–7.
