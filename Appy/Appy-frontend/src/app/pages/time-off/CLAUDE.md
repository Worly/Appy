# CLAUDE.md — Time Off Page (pages/time-off/)

Manages a facility's time-off (blocked availability). Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes
- `/time-off` → `TimeOffComponent` — tabbed list (One-offs / Recurring / Holidays). Active tab + scope persist in the URL (`?tab=oneoff|recurring|holidays&scope=upcoming|past`).
- `/time-off/new?type=oneoff|recurring`, `/time-off/edit/:id` → `TimeOffEditComponent`.

## Model
A `TimeOff` rule has a `recurrence` (OneOff / Weekly / Monthly), a required `label`, optional `notes`, an all-day flag or a time range, and recurrence-specific fields (date range for one-off; day-of-week or day-of-month + optional effective bounds for recurring). `TimeOffListType` (`OneOff` | `Recurring`) and `TimeOffScope` (`Active` | `Expired`) are API-facing tokens for the list endpoint. See `models/time-off.ts`.

## Container & list
`TimeOffComponent` hosts three tabs and a pinned `Upcoming | Past` scope switch (hidden on Holidays). It renders `app-time-off-list` for the active (type, scope) and opens `app-single-time-off` in an `app-dialog` on row click. `SingleTimeOffComponent` is **exported** from `TimeOffModule` so the appointments list can open the same details dialog when a time-off is clicked there. The **Holidays tab is a stub** — static empty state, no add button, no scope switch, no data (no `Source` field/holiday import exists yet). `+ New` routes to the editor with `?type=` matching the tab.

`app-time-off-list` is a forward-only paginated list (via `TimeOffService.getList` → `pagedQuery`). **Active** is bounded (typically one page); **Past** grows unbounded and paginates on scroll, ordered most-recently-ended first. Rows render via `app-single-time-off-list-item`. Schedule/time strings come from the pure helpers in `time-off-display.ts`: `timeOffScheduleText` (one-off date range, or "Every Monday" / "Day of month 15"), `timeOffRecurringRangeText` (a recurring rule's effective span — "from – until" when bounded, "From <date>" when open-ended; empty for one-offs), and `timeOffTimeText`. Both the list row and the `app-single-time-off` details dialog show the recurring effective span alongside the recurrence.

## Editor
`TimeOffEditComponent` is a single component with no recurrence dropdown. Type is fixed on entry (`?type=` on new; from the loaded rule on edit) and cannot be changed (no One-off↔Recurring conversion). Recurring uses a `Weekly | Monthly` segmented control. Delete lives here. Saving a recurring edit opens an "apply changes from" dialog (a date — default today — that forks the rule's timeline via `TimeOffService.saveWithSplit` → `PUT edit?applyFrom=`; or "the entire schedule" for a plain in-place edit). One-off edits save directly. Recurring rules always carry an effective-from (the always-shown "From", defaulting to today); a separate "Set an end date" toggle controls only the optional "until" bound and never clears the start. (The backend also stamps today as the start if a recurring rule arrives without one, as an API safety net.)

## Service
`TimeOffService` extends `BaseModelService` (CRUD) and adds `getList(type, scope)` → `PagedResult<TimeOff>` (calls `GET /timeOff/getList`) and `getForDate` (occurrences for a single date, used elsewhere). Mutations invalidate `timeOffKeys.all` (prefix-matching the list keys) and `appointmentKeys.all`, so both the time-off lists and the appointment list refetch automatically. Also adds `saveWithSplit(timeOff, applyFrom?)` which appends the applyFrom query param for recurring timeline forks.

## Ordering (backend)
The list endpoint orders per quadrant: One-off/Active by start date (ongoing first); One-off/Past & Recurring/Past by end date descending; Recurring/Active by each rule's next occurrence on/after today (rules with no remaining occurrence sort last). Scope classification is a pure date-bounds check (`endDate == null || endDate >= today` = Active) — see `TimeOffService.BuildListPage` / `NextOccurrenceOnOrAfter`.

## Display elsewhere
Expansion is backend-owned. The scroller renders occurrences as a hatched band (bundled in the `CalendarDay` response), clickable to open the `app-single-time-off` details dialog. The appointment list view receives occurrences bundled with its page response. Booking blocks slots that overlap a time-off interval (`AppointmentService`).
