# CLAUDE.md — Feature Pages (src/app/pages/)

Each subdirectory is a feature page with its own CLAUDE.md. **Read that page's CLAUDE.md before editing anything in it.**

| Page | Purpose | Guards | Loading |
|------|---------|--------|---------|
| `login/` | Email/password sign-in | NotLoggedIn | Eager |
| `register/` | New account creation | NotLoggedIn | Eager |
| `error/` | Friendly HTTP error display | None | Eager |
| `dashboard/` | Post-login stats overview | LoggedIn + SelectedFacility | Eager |
| `facilities/` | Workspace list and active-facility selection | LoggedIn | Eager |
| `appointments/` | The primary page — booking calendar and list | LoggedIn + SelectedFacility | Lazy |
| `clients/` | Client list and editor | LoggedIn + SelectedFacility | Lazy |
| `services/` | Service-offering list and editor | LoggedIn + SelectedFacility | Lazy |
| `working-hours/` | Weekly operating hours | LoggedIn + SelectedFacility | Lazy |
| `time-off/` | Blocked availability and holiday import | LoggedIn + SelectedFacility | Lazy |
| `client-notifications/` | Instagram notification settings | LoggedIn + SelectedFacility | Lazy |

`facilities/` deliberately requires no selected facility — it's where you pick one. Its `SelectedFacilityGuard` (`facilities/services/facility.guard.ts`) redirects there when none is selected. Lazy modules preload after the initial render via `PreloadAllModules`.

## Cross-Module Exports

- `ClientsModule` → `ClientLookupComponent` → used by `AppointmentsModule`
- `ServicesModule` → `ServiceLookupComponent` → used by `AppointmentsModule`
- `TimeOffModule` → `SingleTimeOffComponent`, `AllDayTimeOffPickerComponent` → used by `AppointmentsModule`
- `AppointmentsModule` → `SingleAppointmentComponent` → used by `DashboardModule`
