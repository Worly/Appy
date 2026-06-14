# List-view time-offs: combine into the appointment page response

**Date:** 2026-06-14
**Branch:** feature/54-time-off
**Status:** Approved design — ready for implementation plan

## Problem

In the appointments **list view**, time-off occurrences pop in a moment after the
appointments are already rendered, with no loading indicator — a jarring "random pop-in".

Cause: the list fetches appointments and time-offs in two separate requests.
`appointments-list.component` subscribes to the paged appointments query; when a page of
appointments arrives it renders them and only *then* fires a separate
`TimeOffService.getForRange(from, to)` call (windowed by the loaded appointments'
min/max date ± 1 day). The full-page spinner is gated on `appointments == null`, so it
clears as soon as appointments land — the time-offs arrive later and re-render on top.

## Goal

Appointments and their time-offs become atomic by construction — they arrive in one
response and render in the same tick. This removes the pop-in for both the initial load
**and** scroll pagination, and eliminates a round-trip.

## Approach (chosen)

Backend-combined: the appointment list endpoint returns each page's time-off occurrences
alongside its appointments. The frontend paged data seam is generalized to carry a
per-page "sidecar" so the time-offs flow through the same cached query as the appointments.

Rejected alternatives: (a) frontend-only atomic render — still two requests, slower first
paint, doesn't fix scroll pop-in; (b) loading indicator only — keeps two visual phases.

## Backend changes

### New DTO — `Appy/DTOs/AppointmentListPageDTO.cs`
```csharp
public class AppointmentListPageDTO
{
    public List<AppointmentViewDTO> Appointments { get; set; }
    public List<TimeOffOccurrenceDTO> TimeOffs { get; set; }
}
```

### `TimeOffOccurrenceDTO` — add `Id`
Add `public int Id { get; set; }` (the source `TimeOff` rule id). Set it in
`TimeOffService.ToOccurrence` (`Id = t.Id`). Used by the frontend to dedupe occurrences
that appear on a page-boundary date (see below). Additive — harmless to the scroller,
which consumes the same occurrence DTO via `CalendarDayDTO`.

### `AppointmentService.GetList` — return the envelope
- Signature: `Task<AppointmentListPageDTO> GetList(DateOnly date, Direction direction, int skip, int take, SmartFilter? filter, int facilityId)`.
- Inject `ITimeOffService` into `AppointmentService`.
- After materializing the page's appointments, compute the page's date span
  (`min`/`max` of the page appointments' `Date`) and call
  `timeOffService.GetOccurrencesForRange(min, max, facilityId)`.
- Empty page → empty `TimeOffs` (no dates to cover).
- The span is exactly what the page renders: the list is appointment-driven, so a day
  divider (and its time-offs) only appears for days that have at least one appointment.
  Per-page span coverage is therefore complete.

### `AppointmentController.GetList`
Return type → `ActionResult<AppointmentListPageDTO>`. No route/param changes.

## Frontend changes

### Generalize the paged seam — per-page sidecar
Only one real consumer of `pagedQuery`/`getListAdvanced` exists (the appointments list),
so blast radius is that caller + the `dataset` test helper.

- **`shared/services/data/contracts.ts`**: `PagedResult<T, E = never>` gains
  `extras$: Observable<E[]>`.
- **`shared/services/data/paged-query.ts`**: a page becomes `{ items: T[]; extra: E[] }`.
  - `loadPage` returns `Observable<{ items: T[]; extra: E[] }>`.
  - Pagination/end-detection uses `page.items.length` (was `page.length`).
  - `items$` flattens `page.items` (existing reverse-backwards logic unchanged).
  - New `extras$` flattens `page.extra` across pages (same per-page walk; backwards-page
    reversal applied for consistency, though time-off order is irrelevant to rendering).
- **`shared/services/base-model-service.ts`**: `getListAdvanced` gains an optional 4th
  arg `mapPage?: (raw: any) => { items: vT[]; extra: E[] }`, default
  `(raw: any[]) => ({ items: raw.map(o => new viewTypeFactory(o)), extra: [] })`. The
  http call becomes `get<any>` and `mapPage` interprets the body. Every other entity is
  unchanged (no `mapPage` passed → plain array, empty extras).

### `AppointmentService.getList`
Return `PagedResult<AppointmentView, TimeOffOccurrence>`, passing a `mapPage` that splits
the envelope:
```ts
mapPage: (raw: AppointmentListPageDTO) => ({
  items: raw.appointments.map(a => new AppointmentView(a)),
  extra: raw.timeOffs.map(o => new TimeOffOccurrence(o)),
})
```

### `appointments-list.component.ts`
- Remove the `TimeOffService` injection and `loadTimeOffs()` entirely.
- `pagedResult` typed `PagedResult<AppointmentView, TimeOffOccurrence>`.
- Replace the `items$` subscription with one `combineLatest([items$, extras$])`
  subscription: set `appointments`, set deduped `timeOffs`, `renderAppointments()`,
  then `setTimeout(() => checkShouldLoad())`. One atomic render per emission.
- Dedupe time-offs by `(id, dateISO)` when assigning `this.timeOffs` (page-boundary dates
  can repeat across two pages). `renderAppointments()`'s per-day filtering is unchanged.
- Keep the `loadingForwards$` / `loadingBackwards$` subscriptions. The initial-loading
  behavior is unchanged (driven by the loading flags, not by appointment emptiness).

### `TimeOffOccurrence` model — add `id`
Add `id: number` parsed from `TimeOffOccurrenceDTO.Id`.

### `TimeOffService` (frontend) — invalidation + dead-code removal
- Add `appointmentKeys.all` to the service's cross-entity invalidation keys: a time-off
  mutation must now refetch the appointment list, because time-offs live in that response.
- Remove `TimeOffService.getForRange` — the appointments list was its only consumer.
  (`getForDate` is already unused pre-existing dead code; leave it, out of scope.)

### Backend — dead endpoint removal
Remove `TimeOffController.GetForRange` (`GET /timeoff/getForRange`) — the frontend list was
its only caller. **Keep** `ITimeOffService.GetOccurrencesForRange`: it is now called by
`AppointmentService.GetList`. `GetOccurrencesForDate` and its endpoint stay (used by
`CalendarDayController`, `AppointmentController`, and `AppointmentService`).

## Tests

- **`paged-query.spec.ts`**: update the `dataset` helper to wrap rows in
  `{ items, extra: [] }`; add a test asserting `extras$` accumulates across forwards and
  backwards pages (with backwards-page reversal).
- **Backend (`Appy.Tests`)**: a `GetList` test asserting the returned `TimeOffs` cover the
  page's appointment date span (and are empty for an empty page).
- **Component spec**: adjust any `appointments-list` spec for the removed `TimeOffService`
  dependency and the `extras$`-driven time-offs.

## Docs to update (CLAUDE.md)

- `shared/CLAUDE.md`: `PagedResult` gains `extras$`; page envelope; `getListAdvanced` `mapPage`.
- `appointments/CLAUDE.md`: list-view time-offs now come from the list endpoint (no separate fetch).
- `time-off/CLAUDE.md`: list view no longer uses `getForRange`.
- `DTOs/CLAUDE.md`: `TimeOffOccurrenceDTO` gains `Id`.
- `Controllers/CLAUDE.md`: `getList` returns the appointments+time-offs envelope.

## Out of scope

- Scroller view time-off behavior (already combined via `CalendarDayService`/`CalendarDayDTO`).
- Time-off CRUD page behavior.
```
