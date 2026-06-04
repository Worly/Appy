# CLAUDE.md — Time Off Page (pages/time-off/)

Manages a facility's time-off (blocked availability). Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes
- `/time-off` → `TimeOffComponent` (list grouped by recurrence: One-off / Weekly / Monthly)
- `/time-off/new`, `/time-off/edit/:id` → `TimeOffEditComponent`

## Model
A `TimeOff` rule has a `recurrence` (OneOff / Weekly / Monthly), a required `label`, optional `notes`, an all-day flag or a time range, and recurrence-specific fields (date range for one-off; day-of-week or day-of-month + optional effective bounds for recurring). See `models/time-off.ts`.

## Service
`TimeOffService` extends `BaseModelService` (CRUD for free) and adds `getForDate` / `getForRange`, which return backend-expanded `TimeOffOccurrence`s (one per concrete date) consumed by the appointment views.

## Display elsewhere
Expansion is backend-owned. The scroller renders occurrences as a hatched band; the list renders all-day occurrences on the date divider and partial occurrences as inline rows that participate in the gap/overlap logic. Booking blocks slots that overlap a time-off interval (`AppointmentService`).
