# CLAUDE.md — Feature Pages (src/app/pages/)

Each subdirectory is a feature page with its own CLAUDE.md. **Read that page's CLAUDE.md before editing anything in it.**

## Page Index

| Page | Guards | Loading | CLAUDE.md |
|------|--------|---------|-----------|
| `login/` | NotLoggedInGuard | Eager | `login/CLAUDE.md` |
| `register/` | NotLoggedInGuard | Eager | `register/CLAUDE.md` |
| `error/` | None | Eager | `error/CLAUDE.md` |
| `dashboard/` | LoggedIn + SelectedFacility | Eager | `dashboard/CLAUDE.md` |
| `facilities/` | LoggedIn | Eager | `facilities/CLAUDE.md` |
| `appointments/` | LoggedIn + SelectedFacility | Lazy | `appointments/CLAUDE.md` |
| `clients/` | LoggedIn + SelectedFacility | Lazy | `clients/CLAUDE.md` |
| `services/` | LoggedIn + SelectedFacility | Lazy | `services/CLAUDE.md` |
| `working-hours/` | LoggedIn + SelectedFacility | Lazy | `working-hours/CLAUDE.md` |
| `client-notifications/` | LoggedIn + SelectedFacility | Lazy | `client-notifications/CLAUDE.md` |

`SelectedFacilityGuard` lives in `facilities/services/facility.guard.ts` and redirects to `/facilities` when no facility is selected. `PreloadAllModules` preloads lazy modules after the initial render.

## Cross-Module Exports

Some page modules export components consumed by other pages:
- `ClientsModule` exports `ClientLookupComponent` → used by `AppointmentsModule`
- `ServicesModule` exports `ServiceLookupComponent` → used by `AppointmentsModule`
- `AppointmentsModule` exports `SingleAppointmentComponent` → used by `DashboardModule`
