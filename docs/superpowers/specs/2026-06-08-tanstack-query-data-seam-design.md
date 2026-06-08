# Design: Implement TanStack Query behind the data seam

**Date:** 2026-06-08
**Branch:** `feature/tanstack-query-seam` (stacked on `feature/129-data-seam`, PR #130)
**Follow-up issue:** [#131](https://github.com/Worly/Appy/issues/131) (scroller migration, out of scope here)

## Summary

The prior PR (#130, issue #129) replaced the self-written `Datasource` / `EntityChangeNotifyService`
sync layer with a thin, **library-agnostic data seam**: the `QueryResult` / `PagedResult` contracts,
the `query()` / `pagedQuery()` helpers, frozen key factories, and a **no-op** `CacheCoordinator.invalidate()`.
The seam was built specifically so a real cache library could slot in behind the contracts without
touching component code.

This PR cashes that in: it backs the seam with **TanStack Query** (`@tanstack/query-core`), gives
`CacheCoordinator.invalidate()` a real body, and **removes all manual refetch code** in favour of
mutation-driven `invalidateQueries`.

## Decisions (locked with the user)

1. **Integration approach — `query-core` behind the existing Observable seam.** Add only
   `@tanstack/query-core` (the framework-agnostic engine). Reimplement the *insides* of `query()` /
   `pagedQuery()` on `QueryObserver` / `InfiniteQueryObserver`, and bridge their results into the
   **existing** `data$` / `items$` / `loading$` / `error$` Observables. Components are untouched.
   Rejected: the official `@tanstack/angular-query-experimental` signals adapter — it would force a
   rewrite of every consumer, throw away the seam, and stack an experimental package + dev-preview
   Angular-16 signal interop on a 16.1 app.

2. **Paged list — real `InfiniteQueryObserver`.** The appointments list view goes onto a genuine
   infinite query so its pages live in the cache and refetch on invalidation. Rejected: keeping the
   hand-rolled buffer with only an invalidation veneer (the marquee screen would not actually be on
   the cache).

3. **Tenant isolation — clear both caches on facility switch.** Removing the `ngBeforeAttach` refetch
   (see below) would otherwise reintroduce cross-tenant staleness, because the route-reuse strategy
   keeps clients/services list components alive across a facility switch (no page reload). Fix:
   `queryClient.clear()` + a new `CustomReuseStrategy.clear()` (destroys cached components), called
   from `FacilityService.selectFacility()` and `AuthService.logout()`. Query keys stay
   facility-agnostic (tenancy lives in the `facility-id` header). Rejected: facility-in-key (reshapes
   the frozen factories, couples `BaseModelService` to `FacilityService`, and *still* needs the
   route-reuse clear) and accept-the-staleness (a straight regression vs today).

4. **Scroller view — out of scope.** `CalendarDayService` + `utils/smart-caching.ts` keep their
   bespoke windowed-prefetch cache. Tracked as #131.

**Cache defaults:** `staleTime: 0` (instant cached paint, then background revalidate — closest to
today's freshness), `retry: false` (matches current no-retry; keeps error toasts/tests immediate),
`refetchOnWindowFocus: false` (predictable; not a live dashboard), default `gcTime` (5 min — gives
route-reuse revisits an instant cached paint).

## Architecture

```
Component (unchanged)
  └─ subscribes data$ / items$ / loading$ / error$        ← contracts unchanged
       │
   query() / pagedQuery()  (seam internals rewritten)
       │  bridges
   QueryObserver / InfiniteQueryObserver   ← @tanstack/query-core
       │
   QueryClient  (singleton, provided in AppModule, .mount()ed)
       ▲
   CacheCoordinator.invalidate(...keys) / .clear()   ← real body now
       ▲
   BaseModelService mutations (addNew/save/delete/setStatus/setArchived/set)
```

## Detailed changes

### A. Dependency + QueryClient provisioning

- Add `@tanstack/query-core` (v5) to `package.json`.
- Provide one singleton `QueryClient` in `AppModule` with the defaults above; call `queryClient.mount()`
  at startup (e.g. in `AppInitializerService` or the provider factory).
- `CacheCoordinator` injects the `QueryClient`. The seam helpers receive it explicitly (passed from
  `BaseModelService`, which already holds an `Injector`).

### B. `cache-coordinator.ts`

- `invalidate(...keys: CacheKey[])` → `keys.forEach(k => this.client.invalidateQueries({ queryKey: k }))`.
- Add `clear()` → `this.client.clear()`.
- Keep `CacheKey` type and the no-op-era doc comment replaced with the real behaviour.

### C. `query.ts` — `query(client, queryKey, fetchFn)`

- Build a `QueryObserver` with `{ queryKey, queryFn: () => firstValueFrom-style adapter of fetchFn }`.
  (Adapt the `Observable<T>` `fetchFn` to the Promise/`queryFn` TanStack expects — take the first
  emission.)
- Bridge `observer.subscribe(result => ...)` into the existing subjects: `data$ ← result.data`,
  `loading$ ← result.isFetching` (or `isPending`), `error$ ← result.error`. Share one observer
  subscription across all three streams (ref-counted) so it stays subscribed while any of
  `data$/loading$/error$` has subscribers, and tears down when none do.
- `refetch()` → `observer.refetch()`.
- **Contract unchanged** (`QueryResult<T>`).
- Preserve the 404→`undefined` behaviour for `getById` (handled in `BaseModelService`, unchanged).

### D. `paged-query.ts` — `pagedQuery(client, { queryKey, loadPage, sort, filter?, pageSize? })`

- Build an `InfiniteQueryObserver`:
  - `queryFn: ({ pageParam }) => loadPage(pageParam.dir, pageParam.skip, pageSize)` (adapt Observable→Promise).
  - `initialPageParam: { dir: "forwards", skip: 0 }` (the anchor).
  - `getNextPageParam(lastPage, allPages, lastParam)` → `{ dir: "forwards", skip: <accumulated forwards count> }`
    or `undefined` when `lastPage.length < pageSize` (= `reachedEndForwards`).
  - `getPreviousPageParam(firstPage, allPages, firstParam)` → `{ dir: "backwards", skip: <accumulated backwards count> }`
    or `undefined` (= `reachedEndBackwards`).
- Transform `result.data.pages` into `items$`: reverse backwards pages back to ascending, merge into one
  globally-sorted array via `sort`, drop items failing `filter`, and keep the **not-sorted guard**
  (error if a page violates `sort`). This reuses `utils/array-utils` (`isSorted`, `getInsertIndex`).
- `loadMore("forwards")` → `observer.fetchNextPage()`; `loadMore("backwards")` → `observer.fetchPreviousPage()`.
  Preserve the "ignore loadMore until the first page resolved" guard.
- `hasMore("forwards")` → `result.hasNextPage`; `hasMore("backwards")` → `result.hasPreviousPage`.
- Loading flags: `loadingForwards$ ← isFetchingNextPage OR (initial anchor fetch in progress)`,
  `loadingBackwards$ ← isFetchingPreviousPage`, `loading$ ← either`. Folding the initial load into
  *forwards* preserves the current contract semantics and the existing specs.
- `refetch()` → `observer.refetch()` (TanStack refetches all loaded pages).
- **Contract unchanged** (`PagedResult<T>`).

### E. `BaseModelService` — wire read keys

Reads now pass a query key (the factories already exist in `keys.ts`):
- `getById(id)` → `<entity>Keys.detail(id)`.
- `getAll(...)` / `getAllAdvanced(params)` → `<entity>Keys.list(<discriminator>)` (archived / date).
- `getListAdvanced(params, ...)` → `<entity>Keys.list(date)` **plus the serialized filter** in the key,
  so different filters cache as separate entries.

The base class is generic, so it cannot know an entity's key shape. Mechanism: the base read methods
take an explicit `queryKey` argument — `getAllAdvanced(queryKey, params)`, `getById(queryKey, id)`,
`getListAdvanced(queryKey, params, ...)`. The feature services already override `getAll` / `getList`
(and pass `mutationKeys` to `super()`), so they supply the concrete key from their factory
(`clientKeys.list(archived)`, `appointmentKeys.detail(id)`, etc.) when calling the base method. This
keeps key construction with the entity that owns the factory and leaves the base class generic.

Mutations (`addNew`, `save`, `delete`, `setStatus`, `setArchived`, `set`) already call
`this.cache.invalidate(...this.mutationKeys)` — unchanged call sites, real effect now. Prefix matching
means `invalidate(["appointment"])` hits every `["appointment", ...]` query; cross-entity deps
(`ClientService`/`ServiceService` already list `appointmentKeys.all`) refetch appointments on client/
service edits.

### F. Delete manual-refetch code

- `clients.component.ts` / `services.component.ts`: remove `ngBeforeAttach()` + the `BeforeAttach`
  implementation and its import. Invalidation now refreshes the detached-but-alive list in the
  background (the component instance and its observer survive route-reuse detach, so the invalidated
  query refetches); scroll position is preserved because the DOM and observer are untouched.
- `client-lookup.component.ts`: remove `this.listQuery?.refetch()` after `addNew` — `clientKeys.all`
  invalidation covers it. (Keep the `listQuery` reference only if still needed; otherwise simplify.)
- `single-appointment.component.ts` `onChangeStatus`: remove the manual `this.appointment = a` — the
  live `getById` observer re-emits the fresh entity after `appointmentKeys.all` invalidation. (Keep the
  loading flag handling.)

### G. Tenant isolation

- Add `clear()` to `CustomReuseStrategy`: destroy every stored handle's `componentRef` and reset
  `handlers = {}`.
- Call `reuseStrategy.clear()` + `queryClient.clear()` (via `CacheCoordinator.clear()`) from
  `FacilityService.selectFacility()` and `AuthService.logout()`. `FacilityService` / `AuthService`
  inject the `CacheCoordinator` and the `RouteReuseStrategy` (cast to `CustomReuseStrategy`).

## Testing strategy (TDD, RED → GREEN)

Existing **23 data specs** are the safety net. Because `query()` / `pagedQuery()` signatures change
(now take a `QueryClient` + key), update each spec to construct a real `new QueryClient()`
(`@tanstack/query-core` runs headless — no Angular TestBed needed) and pass keys.

New specs to add (RED first):
- `query()`: two `query()` calls with the **same key** share one cache entry / one fetch; a different
  key fetches separately.
- `CacheCoordinator.invalidate(key)` triggers a refetch on a live observer subscribed to that key
  (and prefix matching: `invalidate(["client"])` refetches `["client","list",false]`).
- `CacheCoordinator.clear()` empties the cache (next subscribe refetches).
- `pagedQuery()`: bidirectional fetch via `getNextPageParam`/`getPreviousPageParam`, the not-sorted
  guard, filter-advances-skip, directional loading flags (initial = forwards) — port the existing 12
  behaviours onto the infinite-query-backed implementation.
- `CustomReuseStrategy.clear()` destroys stored handles.

Then: full Karma suite, `npx ng build` (prod), and Cypress E2E (`npx cypress run`) — the infinite-scroll
and status-revert E2E tests are the integration check for the list view + invalidation.

## Documentation updates

- `src/app/shared/CLAUDE.md`: Data Seam section → "backed by TanStack `query-core`"; `CacheCoordinator`
  now invalidates for real + has `clear()`.
- `Appy-frontend/CLAUDE.md`: State Management → real cache, invalidation-driven freshness, tenant-clear
  on facility switch; drop the "data allowed to go stale / refetch on `ngBeforeAttach`" wording.
- `src/app/services/CLAUDE.md`: RouteReuseStrategy section → drop the `ngBeforeAttach` refetch note; add
  the `clear()` method + tenant-reset hook.

## Out of scope

- Scroller view (`CalendarDayService` / `smart-caching.ts`) → #131.
- Other direct-HTTP reads not on the seam (`getFreeTimes`, `FacilityService`, etc.) stay as-is.
- No move to Angular signals (the seam stays Observable-flavoured; `toSignal` remains a future
  one-place flip).

## Risks

- **`InfiniteQueryObserver` mapping** (bidirectional-from-center anchor + loading-flag semantics) is the
  fiddly part. Mitigation: the 12 `pagedQuery` specs + E2E infinite-scroll tests pin the behaviour.
- **TanStack refetches all loaded pages of an infinite query on invalidation** (not just page 1). Fine
  for this app's data volumes (a salon's daily appointments), but noted.
- **`@tanstack/query-core` v5 + TypeScript 4.9 / Angular 16.1 build** compatibility — verify on install
  (query-core has no framework peer deps; v5 supports TS 4.7+).

## Note on the spec file

Per project convention, `docs/superpowers/` specs are **removed from the branch before opening the PR**
(they must not appear in the PR diff).
