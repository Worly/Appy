# CLAUDE.md — Shared Infrastructure (src/app/shared/)

Cross-cutting code consumed by all feature modules. Organized into services, pipes, and directives.

## Shared Services (services/)

### BaseModelService\<TView, TEdit\>

The generic CRUD foundation that all feature services extend. Provides:
- HTTP calls for `getAll`, `get`, `addNew`, `save`, `delete`
- Wraps responses in `Datasource` instances (see below)
- Publishes CRUD events via `EntityChangeNotifyService`
- Pagination via `PageableListDatasource` (20 items per page, loading forwards or backwards from a date anchor)

Feature services (`AppointmentService`, `ClientService`, `ServiceService`, etc.) extend this base and add domain-specific methods.

### Datasource (datasource.ts)

Reactive data containers:
- `ListDatasource<T>`: holds a full list, exposes an Observable stream, supports in-memory add/update/delete
- `SingleDatasource<T>`: holds one entity as an Observable
- `PageableListDatasource<T>`: paginated list with 20-item pages, bidirectional loading, in-memory item cache for already-loaded pages

### EntityChangeNotifyService

Pub/sub hub for CRUD events. When a service creates, updates, or deletes an entity, it publishes here. Components displaying the same data type subscribe and update themselves automatically — no manual refresh, no shared mutable arrays.

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

## Shared Directives (directives/)

| Directive | Purpose |
|-----------|---------|
| `InvokeDirective` | Calls a function expression in a template binding without a wrapper method |
| `FlexSplitterDirective` | Splits a flex container responsively at a breakpoint |
| `ElementRefDirective` | Exposes an element's `ElementRef` as a template variable |
