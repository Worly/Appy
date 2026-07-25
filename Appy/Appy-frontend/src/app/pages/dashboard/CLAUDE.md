# CLAUDE.md — Dashboard Page (pages/dashboard/)

Landing page after login — a quick overview for the selected facility. Requires `LoggedInGuard` + `SelectedFacilityGuard`.

## Components

| Component | Purpose |
|-----------|---------|
| `DashboardComponent` | Container — loads and persists the dashboard settings, renders the stat cards |
| `BookedTodayComponent` | How many appointments were booked today |
| `UpcomingUnconfirmedComponent` | Unconfirmed appointments in the next N days, with a settings dialog to change N |

## Service

`DashboardService` — per-user per-facility settings plus the two stat endpoints.

Imports `AppointmentsModule` to reuse `SingleAppointmentComponent` for the unconfirmed list rows.
