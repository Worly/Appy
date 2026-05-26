# CLAUDE.md — Services Page (pages/services/)

Manages the facility's service offerings. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

```
/services          → ServicesComponent (active services)
/services/archive  → ServicesComponent (archived, same component different mode)
/services/new      → ServiceEditComponent
/services/edit/:id → ServiceEditComponent
```

## Components

- **`ServicesComponent`**: List of services with archive toggle and new-service button. Each card shows the service name, duration, and a color bar matching the service's color.

- **`ServiceEditComponent`**: Create/edit form with:
  - Name and display name fields (display name is shown to clients; name is internal)
  - Color picker — selects from a predefined palette via `ServiceColorPickerComponent`
  - Duration picker (15-minute increments)
  - Archive/unarchive and delete buttons

- **`ServiceColorPickerComponent`**: Grid of preset color swatches. Selecting one sets the service's `colorId`.

- **`ServiceLookupComponent`**: Reusable dropdown/search for selecting a service by name. Exported from `ServicesModule` and used by the appointments edit form.

## Services

**`ServiceService`** (extends `BaseModelService`):
- `getAll(archived?)` — list services filtered by archive status
- `setArchived(service, isArchived)` — toggle archive flag

**`ServiceColorsService`**: Maps a `colorId` integer to its CSS hex color string. Used by the list cards and the color picker.

## Notes

`ServiceLookupComponent` is exported from this module and consumed by `AppointmentsModule`. If you move or rename it, update the appointments edit form.
