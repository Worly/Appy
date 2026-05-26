# CLAUDE.md — Dashboard Page (pages/dashboard/)

Landing page after login. Shows a quick stats overview for the selected facility. Requires `LoggedInGuard` + `SelectedFacilityGuard`.

## Components

- **`DashboardComponent`**: Container that loads and persists dashboard settings (specifically the "upcoming unconfirmed days" value). Renders the two stat sub-components.

- **`BookedTodayComponent`**: Fetches the count of appointments created today via `DashboardService.getBookedToday()`. Displays the count with emoji feedback that scales with volume (0 through 15+).

- **`UpcomingUnconfirmedComponent`**: Lists unconfirmed appointments in the next N days (N is user-configurable, stored in `DashboardSettings`). Includes a settings dialog to change N. Each item links to the full appointment in the appointments page.

## Service

**`DashboardService`**: Thin HTTP wrapper for four endpoints:
- `getSettings()` / `saveSettings()` — persist per-user per-facility dashboard config
- `getBookedToday()` — count of today's new appointments
- `getUpcomingUnconfirmed(numberOfDays)` — list of unconfirmed future appointments

## Notes

Dashboard settings are saved back to the backend whenever the user changes the "upcoming unconfirmed days" value. The `AppointmentsModule` is imported here to reuse the `SingleAppointmentComponent` for rendering the unconfirmed list items.
