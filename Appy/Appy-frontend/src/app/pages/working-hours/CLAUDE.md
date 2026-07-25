# CLAUDE.md — Working Hours Page (pages/working-hours/)

Configures the facility's operating hours per day of the week. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Component

`WorkingHoursComponent` — a single form covering all seven days, where each day holds zero or more time ranges. Days with none read as closed.

## Service

`WorkingHoursService` — reads the facility's hours and replaces all of them in one atomic write. There is no per-day endpoint.

Range ordering and overlap rules are enforced by the backend; the form should not let the user submit state that violates them.
