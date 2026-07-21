# Content-day pagination for the appointments list

**Issues:** #146 (show all time off in appointments list) · #142 (fix pagination edge cases)
**Date:** 2026-07-21
**Scope:** the appointments **list view** only. The scroller view, `getAll`, and other paginated lists are untouched.

## Problem

The list view pages over the **Appointments** table with `skip:N take:M` ordered by `(Date, Time, Duration)`. Time-off occurrences ride along as a per-page sidecar, computed **only from the dates that have appointments on the page** (`AppointmentService.GetList`). Two consequences:

1. **#146:** a day with zero appointments never lands in any page, so its time-off is never fetched or rendered — even an all-day closure is invisible unless something is booked that day.
2. **#142:** `skip:N` counts items, so inserting or deleting an appointment shifts every later offset, producing duplicated or skipped rows across pages.

The naive fix (expand time-offs across the page's whole `min..max` date span) is rejected: one page of 20 appointments can span months or years on a sparse calendar, so expanding an open-ended recurring rule across that span appends an unbounded number of day-entries to a single page, and page boundaries drop or duplicate time-off-only days.

Root cause: appointments and time-offs are two independent sparse sequences on the date axis, and offset pagination over one cannot bound the other.

## Approach

Redefine a page from *N items* to *K content-days*, keyed by a **date cursor** instead of an integer offset.

A **content-day** is any day that has at least one appointment **or** at least one time-off occurrence. A page is the next K content-days from the cursor in the requested direction; empty stretches between content-days are skipped by the query (indexed jump), never walked day by day.

This single redefinition:
- lets time-off-only days ride along in the same page → **#146**
- makes the page boundary a date, which does not shift when an item is inserted or removed → **#142** for this list
- bounds time-off expansion to the returned window → no unbounded page

### Locked semantics

- **Termination:** no forward bound. Forward scroll keeps serving content-days as long as any content exists ahead; with an open-ended recurring closure, `HasMore(forwards)` stays true indefinitely. This is acceptable because every page is real content, never empty-page spam. Backward scroll terminates naturally — every recurring rule has a mandatory `StartDate`, so there is always an earliest content-day.
- **Filter active:** when any smart filter (client / service / status) is present, **no time-offs are fetched at all**. The page is a pure appointment list, so a filtered view has a finite forward end (the last matching appointment). Time-off-only days appear only in the unfiltered list. This is a deliberate change from today's behaviour, where filtered views still show time-offs on days with a matching appointment.
- **Page size:** K content-days per page. Default **K = 14** (subject to tuning during implementation).

## API contract

`GET /appointment/getList`

| Param | Before | After |
|-------|--------|-------|
| `date` | anchor date | **date cursor** — the exclusive boundary carried from the previous page; the anchor (view) date on the first page |
| `direction` | Forwards / Backwards | unchanged |
| `skip` | item offset | **removed** |
| `take` | number of appointments | **K — number of content-days** |
| `filter` | serialized smart filter | unchanged |

Response envelope (`AppointmentListPageDTO`):

```csharp
{
    List<AppointmentViewDTO> Appointments;   // for the window's content-days
    List<TimeOffOccurrenceDTO> TimeOffs;      // for the window's content-days; empty when a filter is active
    DateOnly? NextCursor;                     // boundary to pass as `date` for the next page in this direction; null at the end
    bool HasMore;                             // content exists beyond the window in the requested direction
}
```

Cursor / boundary rules:
- **Forwards, first page:** cursor = anchor date, inclusive (`Date >= cursor`).
- **Forwards, subsequent:** cursor = previous page's `NextCursor` (exclusive).
- **Backwards, first page:** cursor = anchor date, exclusive (`Date < cursor`) — the anchor day's own content belongs to the forwards page.
- **Backwards pages are returned ascending** (not descending), so the frontend does no per-page reversal.

## Backend — `AppointmentService.GetList`

Forwards, no filter:

1. **Candidate appointment days:** `SELECT DISTINCT "Date" WHERE FacilityId = @f AND "Date" >= @cursor ORDER BY "Date" LIMIT K` (applies the smart filter when present). Indexed jump — a 10-year gap to the next appointment resolves in one query.
2. **Candidate time-off days:** the next K occurrence-dates `>= cursor`, via a k-way merge over active recurring rules using the existing `NextOccurrenceOnOrAfter` logic, plus one-off rules by indexed query.
3. **Window days** = merge (1) + (2), sort ascending, distinct, take first K.
4. **Appointments** for the window days (with the existing previous-appointment projection); **TimeOffs** = `GetOccurrencesForDates(windowDays, facilityId)` (already exists).
5. **HasMore** = any appointment or time-off occurrence exists with a date beyond the window's last day; **NextCursor** = last window day + 1 (or `null` when `HasMore` is false).

Backwards is the mirror: candidates are the nearest days `< cursor` (descending selection), the window is returned ascending, `HasMore` / `NextCursor` reference the window's first day − 1.

Filter active: skip steps (2) and the time-off expansion entirely; window days = appointment days only; `TimeOffs = []`.

Building blocks already present: `NextOccurrenceOnOrAfter`, `OrderRecurringByNextOccurrence`, `GetOccurrencesForDate(s)`. A next-occurrence helper may need to be exposed if it is currently private.

## Frontend

### Seam — new `pagedQueryByCursor`

A new builder in `src/app/shared/services/data/` alongside the existing skip/take `pagedQuery`, producing the **same** `PagedResult<T, E>` contract. Component consumption (`items$` / `extras$` / `page$` / `loadMore` / `hasMore`) is unchanged.

It is simpler than the skip/take builder: pages come back **always ascending**, so the backwards-page reversal logic is gone; the TanStack `InfiniteQueryObserver` chains its cursor off each page's `NextCursor`, and `HasMore` drives `getNextPageParam` returning `undefined` at the end.

The time-off tab and holidays tab stay on the skip/take `pagedQuery` — they are the separate #142 follow-ups, out of scope here.

### Component — `AppointmentsListComponent.renderAppointments`

Build the day set from the **union** of appointment dates and time-off occurrence dates (today it is appointment dates only). For a time-off-only day, `buildDayTimeline([], partials)` already emits the correct time-off rows, and all-day occurrences already render as a divider badge — those paths simply are never reached for appointment-less days today. The start-date empty divider and `dedupeOccurrences` boundary handling carry over unchanged.

`AppointmentService.getList` is repointed at `pagedQueryByCursor`, passing the date cursor instead of `skip`.

## Testing

- **Backend (xUnit):** time-off-only day appears in a page; all-day and partial time-offs both render; filter active → `TimeOffs` empty; sparse calendar (10-year gap) returns the far appointment in a single page; forward-unbounded with an open-ended recurring closure; backward floor at earliest content; page-boundary day not double-counted.
- **Frontend (Karma/Jasmine):** `pagedQueryByCursor` spec (forward/backward chaining, `HasMore` termination, refetch reconstruction); `AppointmentsListComponent` render spec for a time-off-only day divider.
- **E2E (Cypress):** a day with only a time-off shows in the list.

## Risks

- **TanStack refetch reconstruction of a bidirectional infinite query is fiddly** (the existing skip/take builder carries a long comment about the monotonic-chain requirement). The always-ascending cursor design should make it easier, but the implementation plan nails it with a `pagedQueryByCursor` spec test **before** wiring the component.

## CLAUDE.md updates

- `pages/appointments/CLAUDE.md` — list view: content-day pagination, time-off-only days render, filter suppresses time-offs.
- `Controllers/CLAUDE.md` — `getList` contract (cursor + content-days, time-offs suppressed under filter).
- `Services/CLAUDE.md` — `AppointmentService.GetList` behaviour.
- `shared/CLAUDE.md` — new `pagedQueryByCursor` builder.
- `DTOs/CLAUDE.md` — `AppointmentListPageDTO` gains `NextCursor` / `HasMore`.

## Out of scope

- Time-off tab and holidays tab pagination (separate #142 follow-ups).
- Scroller view, `getAll`, free-time generation.
