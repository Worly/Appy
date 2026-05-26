# CLAUDE.md — Facilities Page (pages/facilities/)

Manages the user's workspaces and controls which facility is active. Requires `LoggedInGuard` only — intentionally accessible without a selected facility so users can select one.

## Components

- **`FacilitiesComponent`**: Lists all facilities owned by the user. Button to create a new facility. Selecting a facility sets it as active and navigates to the home page.

- **`SingleFacilityComponent`**: One facility card. Context menu with edit and delete actions. Delete shows a confirmation dialog before proceeding.

- **`FacilityEditComponent`**: Modal form for creating or editing a facility (name field only).

- **`SelectedFacilityComponent`**: Small display component embedded in the navigation bar showing the currently active facility name.

## Service

**`FacilityService`**: Direct HTTP service (does not extend `BaseModelService`). Manages:
- `loadMy()` — fetches all user facilities and the currently selected facility ID
- `getSelected()` — returns the active `Facility` object
- `selectFacility(id)` — sets active facility (persisted on backend)
- `addNew(name)` / `edit(id, name)` / `deleteFacility(id)`

Also provides:
- **`FacilityInterceptor`**: HTTP interceptor that adds the `facility-id` header to all outgoing requests. Provided at module level here, not in `AppModule`.
- **`SelectedFacilityGuard`** (`facility.guard.ts`): Route guard used across the app; redirects to `/facilities` if no facility is selected.
