# CLAUDE.md — Facilities Page (pages/facilities/)

The user's workspaces and which one is active. Requires `LoggedInGuard` only — deliberately reachable without a selected facility, since this is where one is picked.

## Components

| Component | Purpose |
|-----------|---------|
| `FacilitiesComponent` | Lists the user's facilities; selecting one activates it and navigates home |
| `SingleFacilityComponent` | One facility card with its edit and delete actions |
| `FacilityEditComponent` | Modal create/edit form |
| `SelectedFacilityComponent` | Shows the active facility name in the navigation bar |

## Services

- `FacilityService` — facility CRUD plus loading and setting the active facility. Direct HTTP; does not extend `BaseModelService`.
- `FacilityInterceptor` — adds the `facility-id` header to outgoing requests. Provided here, not in `AppModule`.
- `SelectedFacilityGuard` (`facility.guard.ts`) — used app-wide; redirects here when no facility is selected.
