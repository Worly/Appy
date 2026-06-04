# Time Off — Design Spec

**Issue:** [#54 Implement Time Off](https://github.com/Worly/Appy/issues/54)
**Branch:** `feature/54-time-off` (based on `feature/125-gap-overlap-indicators`, *not* `main` — the gap/overlap work is unmerged and the list display depends on it)
**Date:** 2026-06-04

## Scope

Manual time-off entry only. A facility owner can block availability so those times stop being bookable and are surfaced in both appointment views.

**In scope**
- The four manual variants from the issue, as two independent dimensions:
  - **Recurrence**: one-off (date range) · weekly (by weekday) · monthly (by day-of-month)
  - **Time-of-day**: all-day · specific time range
- Optional effective start/end bounds on recurring entries.
- A required label per entry.
- Time-off blocks appointment booking (free-time slots + conflict check).
- Display in the scroller view and the list view.

**Out of scope (deferred / explicitly excluded)**
- National-holiday import.
- Per-occurrence exceptions — editing or deleting a recurring entry affects the whole rule (no "this occurrence only").
- Live `EntityChangeNotifyService` sync of expanded occurrences into the appointment views (they refresh on navigation/reload after a time-off edit).

## Data Model

One flat table with a recurrence discriminator (matches the codebase's lightweight `WorkingHour` style; join-free; the enum maps 1:1 to the UI type selector).

```
enum TimeOffRecurrence { OneOff, Weekly, Monthly }

TimeOff
  Id          int
  FacilityId  int                 // tenant scope (every entity except User/LoginSession)
  Label       string              // REQUIRED, non-empty after trim
  Notes       string?             // optional free-text, auto-trimmed (like Appointment.Notes)

  Recurrence  TimeOffRecurrence

  // Date window — reused for two meanings:
  StartDate   DateOnly?           // OneOff: first blocked day (required)
  EndDate     DateOnly?           //         last blocked day  (required)
                                  // Weekly/Monthly: optional effective-from / -until bounds

  // Recurrence keys
  DayOfWeek   DayOfWeek?          // Weekly only
  DayOfMonth  int?                // Monthly only, 1..31

  // Time-of-day (independent of recurrence)
  IsAllDay    bool
  TimeFrom    TimeOnly?           // when !IsAllDay
  TimeTo      TimeOnly?
```

### "Applies on date D?" predicate

The single rule everything (booking + both views) is built on:

- **OneOff:** `StartDate ≤ D ≤ EndDate`
- **Weekly:** `D.DayOfWeek == DayOfWeek` **and** within the optional `[StartDate, EndDate]` bounds
- **Monthly:** `D.Day == DayOfMonth` **and** within the optional bounds — months without that day (e.g. the 31st in February) are simply skipped

**Blocked interval on D:** whole day if `IsAllDay`, else `[TimeFrom, TimeTo)`.

### Validation (service layer, mirrors `WorkingHourService`)

- `Label` required, non-empty after trim
- `!IsAllDay` ⇒ `TimeFrom < TimeTo`
- `OneOff` ⇒ `StartDate` and `EndDate` present, `Start ≤ End`
- `Weekly` ⇒ `DayOfWeek` present
- `Monthly` ⇒ `DayOfMonth ∈ 1..31`
- Recurring bounds: if both present, `Start ≤ End`

### EF / persistence
- New `DbSet<TimeOff>` on `MainDbContext`; EF migration.
- `FacilityId` foreign key; all queries filter by it for tenant isolation.

## Backend — Management Slice

Straight mirror of `ServiceController` / `ServiceService`.

- **`TimeOffController`** at `/timeoff`, `[SelectedFacility]`:
  `getAll`, `get/{id}`, `addNew` (POST), `edit/{id}` (PUT), `delete/{id}` (DELETE)
- **`ITimeOffService` / `TimeOffService`**: `GetAll`, `GetById`, `AddNew`, `Edit`, `Delete` + the validation above, plus the shared expansion helpers:
  - `AppliesOn(TimeOff, DateOnly) → bool`
  - `GetOccurrencesForDate(DateOnly, facilityId) → List<TimeOffOccurrence>`
  - `GetOccurrencesForRange(DateOnly from, DateOnly to, facilityId) → List<TimeOffOccurrence>`
- **DTOs:**
  - `TimeOffDTO` — the raw rule (all fields above), for CRUD
  - `TimeOffOccurrenceDTO { Date, Label, Notes, IsAllDay, TimeFrom, TimeTo }` — the **expanded, on-date** shape consumed by the views; distinct from the rule

Backend owns expansion entirely — one implementation feeds booking and both views, so there is no second (TypeScript) copy of the predicate that could drift.

## Backend — Booking Impact

Time-off is just one more reason a slot is unavailable, alongside "outside working hours" and "overlaps an appointment."

- `GetFreeTimes` and `IsAppointmentTimeOk` gain a `List<(TimeOnly From, TimeOnly To)> blockedIntervals` parameter. In the existing 5-minute slot loop, one more guard:
  `else if (blockedIntervals.Any(b => Overlap(time, time.Add(duration), b.From, b.To))) ok = false;`
  An all-day occurrence expands to a single `[00:00, 23:59:59]` interval that wipes the whole day.
- `AppointmentService` takes an `ITimeOffService` dependency. `AddNew`, `Edit`, and the `getFreeTimes` endpoint already fetch the date's working hours — they also fetch the date's occurrences (`GetOccurrencesForDate`) and pass the intervals in.
- `ignoreTimeNotAvailable=true` still overrides, so a user can deliberately book over time-off via the existing confirm-and-proceed flow. No new conflict UI.

## Backend — View Fetch

- **Scroller:** `CalendarDayDTO` gains `TimeOffs: List<TimeOffOccurrenceDTO>` for that single date, populated by `CalendarDayController`/service via `GetOccurrencesForDate`.
- **List:** new endpoint `GET /timeoff/getForRange?from=&to=` → `List<TimeOffOccurrenceDTO>` (each carries its `Date`). The list view fetches occurrences for its currently-loaded date window and extends the fetch as bidirectional pagination grows the window.

## Frontend — Model & Service

- **`TimeOff extends EditModel<TimeOff>`** + `TimeOffDTO` (`ENTITY_TYPE = "timeOff"`), with recurrence-conditional validators mirroring the backend (label always required; time order when not all-day; recurrence-specific required fields).
- **`TimeOffOccurrence`** (read-only view model) + `TimeOffOccurrenceDTO`.
- **`TimeOffService extends BaseModelService<TimeOff, TimeOff>`** (`controllerName = "TimeOff"`) — CRUD for free + `EntityChangeNotifyService` integration. Adds occurrence fetchers `getForDate(date)` / `getForRange(from, to)` returning `TimeOffOccurrence[]`.

## Frontend — Management Page

- New lazy **`TimeOffModule`** at `/time-off` (`LoggedInGuard` + `SelectedFacilityGuard`); nav entry near Working Hours.
- Routes (appointments-style): `/time-off` (list), `/time-off/new`, `/time-off/edit/:id`.
- **`TimeOffComponent`** — list **grouped by recurrence type** (One-off / Weekly / Monthly sections); each entry shows its label, a human-readable schedule, and the time (or "All day"); add / edit / delete.
- **`TimeOffEditComponent`** — a recurrence-type selector that reveals conditional fields:
  - **One-off** → start + end date pickers (Material dayjs adapter)
  - **Weekly** → weekday dropdown + optional effective from/until
  - **Monthly** → day-of-month (1–31) + optional effective from/until
  - **All three** → required label text, optional notes textarea, all-day toggle, and time-from/time-to (hour/minute dropdowns, à la Working Hours) when not all-day

## Frontend — Scroller Display

- `CalendarDay` model gains `timeOffs` occurrences.
- `SingleDayAppointmentsComponent` gets a `timeOffs` input and a `renderTimeOffs()` that pushes a new `"time-off"` `RenderedInterval` source into the time-status layer (it already inverts working hours into `"closed-time"` bands). The time-off band renders **on top of** closed-time with a distinct hatched/colored style and the **label** shown on it; all-day → full-height band. Styling in SCSS.

## Frontend — List Display

- **Whole-day occurrences** → rendered on the **date divider line** (e.g. a "Closed · {label}" badge).
- **Partial occurrences** → rendered as **appointment-like rows** interleaved in time order, styled to read clearly as *non-bookable* (label + time range, muted/hatched, no client/service). New `"time-off"` member in the list's `renderedItems` union type.
- **Gap/overlap integration:** the existing gap/overlap divider logic (`renderAppointments()` + `timeBetweenMs()`, which today compares consecutive same-day appointments) is generalized to treat partial time-offs **exactly like appointments** — idle gaps compute around them, and an appointment that overlaps a time-off gets the existing **red-overlap** treatment (a useful "you booked during time off" signal).
- **All-day + partial on the same day:** render **both** (no suppression).
- Days still render only when they contain an appointment (the list is appointment-driven). Consequence: a blocked day with no appointments does not appear in the list — it does in the scroller. This applies to both whole-day and partial offs.
- List fetches occurrences via `getForRange` over its loaded window.
- After a time-off edit, the appointment views refresh on navigation/reload (occurrences are not carried by `EntityChangeNotifyService`).

## Documentation Updates (per project convention)

- New `pages/time-off/CLAUDE.md`; add the page to `pages/CLAUDE.md`, the root CLAUDE.md map, and the frontend routing/guards table.
- Update `Domain/CLAUDE.md` (new `TimeOff` entity), `Controllers/CLAUDE.md` (route prefix), `Services/CLAUDE.md` (new service + booking rule), `DTOs/CLAUDE.md` (two new DTOs).
- Update `pages/appointments/CLAUDE.md` (time-off in both views; gap/overlap now spans time-offs) and `models/CLAUDE.md` (new models).

## Testing

- **Backend unit (`Appy.Tests`):** validation rules; `AppliesOn`/expansion (one-off range, weekly with/without bounds, monthly incl. the Feb-no-31 skip); booking rejection via blocked intervals; `ignoreTimeNotAvailable` override.
- **Frontend:** model validation; list rendering — whole-day on the date line, partial inline, and gap/overlap correctness when a time-off sits between or overlaps appointments.
- **E2E (Cypress):** create each recurrence type; confirm it removes a slot from booking and shows in both views.

## Build Order (suggested)

1. Domain `TimeOff` + migration + DTOs.
2. `TimeOffService` (CRUD + validation + expansion) + `TimeOffController`; backend tests.
3. Booking impact (`GetFreeTimes`/`IsAppointmentTimeOk` + callers); backend tests.
4. Frontend model/service + `/time-off` management page.
5. Scroller display.
6. List display (incl. gap/overlap generalization).
7. CLAUDE.md updates throughout; E2E.
