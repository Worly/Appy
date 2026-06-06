# CLAUDE.md — Shared Infrastructure (src/app/shared/)

Cross-cutting code consumed by all feature modules. Organized into services, pipes, and directives.

## Shared Services (services/)

### BaseModelService\<TEdit, TView\>

The generic CRUD foundation that all feature services extend. Returns the library-agnostic data contracts from the Data Seam (below):
- `getAll()` / `getAllAdvanced(params)` → `QueryResult<vT[]>` (one-shot list fetch)
- `getById(id)` → `QueryResult<vT | undefined>` (single entity; `data$` emits `undefined` on 404)
- `getListAdvanced(params, sort, filter?, filterPredicate?)` → `PagedResult<vT>` (paginated list, 20/page, bidirectional from an anchor)
- `get(id)` → `Observable<TEdit>` (the editable model for forms)
- `addNew` / `save` / `delete` → mutate, return the fresh entity, and call `CacheCoordinator.invalidate(...mutationKeys)`

Feature services (`AppointmentService`, `ClientService`, …) extend this base, add domain-specific methods, and pass their `mutationKeys` (own keys + cross-entity deps) to `super()`.

### Data Seam (services/data/)

A thin, **library-agnostic** seam that replaced the old self-written `Datasource` / `EntityChangeNotifyService` sync layer. Data is allowed to go stale (acceptable for this app — a refetch is cheap); a real caching library (TanStack Query / Apollo / NgRx Entity / a revived custom layer) can be dropped in later behind these contracts **without touching component code**.

- **Contracts (`contracts.ts`)**: `QueryResult<T>` (`data$` / `loading$` / `error$` / `refetch()`) for single fetches; `PagedResult<T>` (`items$` / `loading$` / `loadingForwards$` / `loadingBackwards$` / `error$` / `loadMore(dir)` / `hasMore(dir)` / `refetch()`) for the bidirectional infinite list — directional loading flags let the list view show top vs bottom spinners. Observable-flavoured for Angular 16; wrap with `toSignal` at this surface when moving to signals.
- **`query(fetchFn)`** (`query.ts`): builds a `QueryResult`; `shareReplay({refCount})` so multiple `| async` pipes share one in-flight fetch. No cache, no cross-view sharing.
- **`pagedQuery(opts)`** (`paged-query.ts`): builds a `PagedResult` — the bidirectional page buffer salvaged from the old `PageableListDatasource`, with the cross-component sync removed. Pagination is preserved (20/page).
- **Key factories (`keys.ts`)**: `appointmentKeys` / `clientKeys` / `serviceKeys` / `workingHourKeys` — frozen `{ all, list, detail }` vocabulary for a future cache.
- **`CacheCoordinator`** (`cache-coordinator.ts`): `invalidate(...keys)` is a **no-op today**. Mutation sites declare their invalidations now (typed against the key factories, including cross-entity deps — a client/service edit invalidates appointments, which embed both), so the day a real cache lands it only needs a body here.

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
