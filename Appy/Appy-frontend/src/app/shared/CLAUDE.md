# CLAUDE.md — Shared Infrastructure (src/app/shared/)

Cross-cutting code consumed by every feature module: services, pipes, and directives.

## services/

| Item | Purpose |
|------|---------|
| `BaseModelService<TEdit, TView>` | The generic CRUD foundation every feature service extends. Exposes get-by-id / get-all / paged-list reads returning data-seam contracts, plus add/save/delete mutations that invalidate the cache. Subclasses pass their own key factory and any cross-entity invalidation keys |
| `smart-filter.ts` | TypeScript mirror of the backend Smart Filter DSL (see `Appy/Services/SmartFilter/CLAUDE.md`), serialized into URL query params |

### services/data/ — the data seam

A library-agnostic seam over a TanStack Query cache. Components only ever see the contracts, so the cache underneath could be swapped without touching them.

| File | Purpose |
|------|---------|
| `contracts.ts` | `QueryResult<T>` for single fetches and `PagedResult<T, E>` for bidirectional infinite lists — the only shapes components consume |
| `query.ts` | `query()` — builds a `QueryResult` from a fetch function |
| `paged-query.ts` | `pagedQuery()` — offset-paged `PagedResult` |
| `paged-query-by-cursor.ts` | `pagedQueryByCursor()` — cursor-paged `PagedResult`, used by the appointments list |
| `keys.ts` | The per-entity query-key factories that identify cached queries |
| `cache-coordinator.ts` | `invalidate()` to refetch matching queries after a mutation, `clear()` for a hard tenant reset on facility switch or logout |
| `query-client.ts` | The `QueryClient` singleton factory, mounted in `AppModule` |

### services/auth/

`AuthService` (token storage, login/register/logout, auto-refresh), `LoggedInGuard` / `NotLoggedInGuard`, and `AuthHttpInterceptor` (attaches the bearer token).

### services/errors/

`ErrorInterceptor` (extracts the error body from failed responses) and `ErrorTranslateService` (maps backend error codes to i18n keys — see `Appy/Exceptions/CLAUDE.md`).

## pipes/

| Pipe | Purpose |
|------|---------|
| `TranslatePipe` | Translation key → current-language string |
| `FormatDurationPipe` | dayjs Duration → readable text |
| `ToDurationPipe` | String → dayjs Duration |
| `FilterPipe` | Filters an array by a property value |
| `RelativeDatePipe` | Date → localized relative label ("Today", "in 3 days") |
| `DateRelationPipe` | Date → `'today' \| 'future' \| 'past'` token for `[ngClass]` |

## directives/

| Directive | Purpose |
|-----------|---------|
| `InvokeDirective` | Calls a function expression in a template without a wrapper method |
| `FlexSplitterDirective` | Splits a flex container responsively at a breakpoint |
| `ElementRefDirective` | Exposes an element's `ElementRef` as a template variable |
