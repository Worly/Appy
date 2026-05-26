# CLAUDE.md — Feature Pages (src/app/pages/)

Each subdirectory is a feature area. Most are lazy-loaded Angular modules; simpler pages are declared directly in `AppModule`.

## Page Overview

| Page | Loading | Guards | Purpose |
|------|---------|--------|---------|
| `login` | Eager | NotLoggedInGuard | Email/password login |
| `register` | Eager | NotLoggedInGuard | Account creation |
| `dashboard` | Eager | LoggedIn + SelectedFacility | Analytics overview |
| `facilities` | Eager | LoggedIn | Manage workspaces; select the active facility |
| `appointments` | Lazy | LoggedIn + SelectedFacility | Main scheduling interface |
| `clients` | Lazy | LoggedIn + SelectedFacility | Client management |
| `services` | Lazy | LoggedIn + SelectedFacility | Service offerings management |
| `working-hours` | Lazy | LoggedIn + SelectedFacility | Facility operating hours |
| `client-notifications` | Lazy | LoggedIn + SelectedFacility | Instagram notification configuration |
| `error` | Eager | None | Error display fallback |

`SelectedFacilityGuard` redirects to `/facilities` if no facility is selected. `PreloadAllModules` preloads lazy modules after the initial render.

## Internal Structure (lazy pages)

Each lazy page folder typically contains:
- `*-routing.module.ts` — child route definitions
- `*-page.module.ts` — NgModule with component declarations
- `components/` — components used only by this page
- `services/` — page-specific service (usually extends `BaseModelService`)

## Appointments Page

The most complex page. Has two switchable runtime views:
- **Scroller** (`components/appointments-scroller/`): calendar-style, one day with time-slot lanes, uses `rendered-interval.ts` for pixel positioning
- **List** (`components/appointments-list/`): chronological list, paginated forwards/backwards via `PageableListDatasource`

URL state: `?date=YYYY-MM-DD&filter=<SmartFilterJSON>`. View type persisted in LocalStorage.

Both views share `AppointmentService`, the same active date, and the same Smart Filter state. The `appointment-edit/` sub-component handles both creation and editing, including the date-time chooser and a time-button grid for available slots.

## Clients & Services Pages (symmetric)

Both follow the same pattern: list with archive toggle, modal edit form, archive/unarchive action button. Services adds color selection; clients adds contact management (Instagram/WhatsApp with `@Children`-tracked `ClientContact` array in the edit model).

## Facilities Page

Accessible without a selected facility (no `SelectedFacilityGuard`). Selecting a facility here triggers navigation to the home route (`/appointments`).

## Client Notifications Page

Configuration-only — no list, just a single settings form. Template placeholders supported: `{clientName}`, `{clientSurname}`, `{service}`, `{date}`, `{time}`. These are resolved by the backend when sending messages.
