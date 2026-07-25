# CLAUDE.md — Services Page (pages/services/)

Manages the facility's service offerings. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

```
/services          → ServicesComponent (active)
/services/archive  → ServicesComponent (archived, same component)
/services/new      → ServiceEditComponent
/services/edit/:id → ServiceEditComponent
```

## Components

| Component | Purpose |
|-----------|---------|
| `ServicesComponent` | Service list with an archive toggle |
| `ServiceEditComponent` | Create/edit form — internal name, client-facing display name, color, duration, archiving, deletion |
| `ServiceColorPickerComponent` | Grid of preset color swatches |
| `ServiceLookupComponent` | Reusable service picker — **exported** and used by `AppointmentsModule`'s edit form |

## Services

- `ServiceService` — extends `BaseModelService`; adds archive-aware listing and the archive toggle.
- `ServiceColorsService` — resolves a service's `colorId` to its CSS color, used by the list cards and the picker.

Deletion is only possible while no appointment references the service; archiving is the fallback (enforced by the backend).
