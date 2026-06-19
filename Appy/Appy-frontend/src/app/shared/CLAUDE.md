# CLAUDE.md — Shared Infrastructure (src/app/shared/)

Cross-cutting code consumed by all feature modules. Organized into services, pipes, and directives.

## Shared Services (services/)

### BaseModelService\<TEdit, TView\>

The generic CRUD foundation that all feature services extend. Returns the library-agnostic data contracts from the Data Seam (below):
- `getAllAdvanced(queryKey, params)` → `QueryResult<vT[]>` (one-shot list fetch)
- `getById(id)` → `QueryResult<vT | undefined>` (single entity; builds the cache key from the service's own `keys.detail(id)`, so callers pass only the id; `data$` emits `undefined` on 404)
- `getListAdvanced(queryKey, params, filter?, mapPage?)` → `PagedResult<vT, E>` (paginated list, 20/page, bidirectional from an anchor; `filter` forwarded to backend; optional `mapPage` maps raw response to `{ items: vT[]; extra: E[] }` — enables the `extras$` sidecar stream; without `mapPage`, `extras$` is always empty)
- `get(id)` → `Observable<TEdit>` (the editable model for forms)
- `addNew` / `save` / `delete` → mutate, return the fresh entity, and call `CacheCoordinator.invalidate(...mutationKeys)` (now with real effect — matching active queries refetch automatically)

Feature services (`AppointmentService`, `ClientService`, …) extend this base, add domain-specific methods, and pass their own `EntityKeyFactory` (e.g. `clientKeys` — used to build `getById`/`getAll` keys) plus any cross-entity invalidation keys to `super()`. `mutationKeys` is then `[keys.all, ...crossEntityKeys]`.

### Data Seam (services/data/)

A thin, **library-agnostic** seam that replaced the old self-written `Datasource` / `EntityChangeNotifyService` sync layer, now **backed by TanStack Query (`@tanstack/query-core`)** as a real client-side cache. The `QueryResult` / `PagedResult` contracts are unchanged; the library sits behind them (a different cache could still be swapped in without touching component code).

The `QueryClient` singleton is provided and mounted in `AppModule` via a factory in `services/data/query-client.ts` with defaults: `staleTime: 0`, `retry: false`, `refetchOnWindowFocus: false`.

- **Contracts (`contracts.ts`)**: `QueryResult<T>` (`data$` / `loading$` / `error$` / `refetch()`) for single fetches; `PagedResult<T, E = never>` (`items$` / `extras$` / `page$` / `loading$` / `loadingForwards$` / `loadingBackwards$` / `error$` / `loadMore(dir)` / `hasMore(dir)` / `refetch()`) for the bidirectional infinite list — `extras$` accumulates the per-page sidecar arrays in display order; `page$` pairs `items` + `extras` from one emission (subscribe to it instead of combining `items$`/`extras$`, which would flash a new-items / stale-extras pair); directional loading flags let the list view show top vs bottom spinners. Observable-flavoured for Angular 16; wrap with `toSignal` at this surface when moving to signals.
- **`query(client, queryKey, fetchFn)`** (`query.ts`): wraps a `QueryObserver` — lazily created on first subscription, ref-counted, torn down on last unsubscribe. The Observable `fetchFn` is adapted to the queryFn Promise via `firstValueFrom`.
- **`pagedQuery(client, opts)`** (`paged-query.ts`): wraps an `InfiniteQueryObserver`; `loadPage` now returns `Page<T, E>` (`{ items, extra }`); backwards pages are reversed and concatenated into `items$`; `extra` arrays are accumulated in the same order into `extras$`. `loadMore(dir)` is a no-op while a page in that direction is already loading (scroll-burst guard) and also while a full refetch is in flight (stale-snapshot guard). `refetch()` refreshes all loaded pages.
- **Key factories (`keys.ts`)**: `appointmentKeys` / `clientKeys` / `serviceKeys` / `workingHourKeys` / `timeOffKeys` — the **live query keys** used by the cache: `getById` → `detail(id)`, `getAll` → `list(...)`, paged list → `list(date)` + serialized filter (for time-off, `list(type, scope)` builds the pagination key).
- **`CacheCoordinator`** (`cache-coordinator.ts`): `invalidate(...keys)` calls `queryClient.invalidateQueries({ queryKey })` for each key (prefix match — matching active queries refetch in the background automatically). `clear()` calls `queryClient.clear()` for a hard tenant reset on facility switch / logout.

### Smart Filter (smart-filter.ts)

TypeScript types that mirror the backend Smart Filter DSL (see `Appy/Services/SmartFilter/CLAUDE.md`). Used to build filter objects in components, which are then serialized to URL query parameters.

### Auth Services (services/auth/)

- `AuthService`: JWT and refresh token management in LocalStorage; login/register/logout; auto-refresh on expiry
- `LoggedInGuard` / `NotLoggedInGuard`: route guards
- `AuthHttpInterceptor`: attaches `Authorization: Bearer <token>` to every outgoing request

### Error Services (services/errors/)

- `ErrorInterceptor`: catches HTTP error responses and extracts the error body
- `ErrorTranslateService`: maps backend error code strings (e.g. `EMAIL_TAKEN`) to i18n translation keys for display

### FacilityInterceptor

Adds the `facility-id: <id>` header to all API requests, reading the selected facility ID from `AuthService`.

## Shared Pipes (pipes/)

| Pipe | Purpose |
|------|---------|
| `TranslatePipe` | Resolves a translation key to the current language string |
| `FormatDurationPipe` | dayjs Duration → `"1h 30m"` |
| `ToDurationPipe` | String → dayjs Duration |
| `FilterPipe` | Filters an array by a property value |
| `RelativeDatePipe` | dayjs date → localized relative label ("Today", "Tomorrow", "in 3 days", "2 days ago"); impure |
| `DateRelationPipe` | dayjs date → `'today' \| 'future' \| 'past'` token for `[ngClass]`; impure |

## Shared Directives (directives/)

| Directive | Purpose |
|-----------|---------|
| `InvokeDirective` | Calls a function expression in a template binding without a wrapper method |
| `FlexSplitterDirective` | Splits a flex container responsively at a breakpoint |
| `ElementRefDirective` | Exposes an element's `ElementRef` as a template variable |
