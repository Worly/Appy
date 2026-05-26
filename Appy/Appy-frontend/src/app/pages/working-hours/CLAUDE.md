# CLAUDE.md — Working Hours Page (pages/working-hours/)

Configures the facility's operating hours per day of the week. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Components

- **`WorkingHoursComponent`**: A form displaying all seven days (Monday–Sunday). Each day shows its time range(s) with hour and minute dropdowns (hours 0–24, minutes 0/15/30/45). Days with no hours show as "CLOSED". The user can add or remove ranges per day. Saves all days atomically on submit.

## Service

**`WorkingHoursService`**: Two endpoints:
- `getAll()` — fetches current working hours for the selected facility
- `set(workingHours[])` — replaces all working hours for the facility in one POST (atomic batch replacement)

## Validation

`timeFrom` must be strictly before `timeTo`, and ranges within the same day must not overlap. Both rules are enforced by the backend (returns a validation error on violation). The client-side should prevent submitting invalid state.
