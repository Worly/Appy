# CLAUDE.md — Clients Page (pages/clients/)

Manages the facility's client list. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

```
/clients          → ClientsComponent (active clients)
/clients/archive  → ClientsComponent (archived clients, same component different mode)
/clients/new      → ClientEditComponent
/clients/edit/:id → ClientEditComponent
```

## Components

- **`ClientsComponent`**: List of clients with a search bar, archive toggle, and new-client button. Each card shows the client's name and first contact. Navigates to edit on tap.

- **`ClientEditComponent`**: Create/edit form with:
  - Name and surname fields
  - Dynamic contacts array — each contact has a type (Instagram/WhatsApp) and a value (username/phone). Contacts can be added, reordered, and deleted. The first contact is marked as primary.
  - Notes textarea
  - Archive/unarchive button (replaces delete when the client has appointments)
  - Delete button (only shown when client has no appointments)
  - "View appointments" button — navigates to `/appointments` filtered by this client

- **`ClientLookupComponent`**: Reusable dropdown/search for selecting a client by name. Exported from `ClientsModule` and used by the appointments page in the edit form.

## Service

**`ClientService`** (extends `BaseModelService`):
- `getAll(archived?)` — list clients, optionally filtered by archive status
- `setArchived(client, isArchived)` — toggle archive flag

## Notes

`ClientLookupComponent` is exported from this module and consumed by `AppointmentsModule`. If you move or rename it, update the appointments edit form.
