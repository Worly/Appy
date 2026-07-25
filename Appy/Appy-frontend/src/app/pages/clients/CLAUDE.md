# CLAUDE.md — Clients Page (pages/clients/)

Manages the facility's client list. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

```
/clients          → ClientsComponent (active)
/clients/archive  → ClientsComponent (archived, same component)
/clients/new      → ClientEditComponent
/clients/edit/:id → ClientEditComponent
```

## Components

| Component | Purpose |
|-----------|---------|
| `ClientsComponent` | Searchable client list with an archive toggle |
| `ClientEditComponent` | Create/edit form, including the client's dynamic contacts array, archiving, deletion, and a link to this client's appointments |
| `ClientLookupComponent` | Reusable client picker — **exported** and used by `AppointmentsModule`'s edit form |

## Service

`ClientService` extends `BaseModelService` and adds archive-aware listing and the archive toggle. Deletion is only possible while no appointment references the client; archiving is the fallback (enforced by the backend).
