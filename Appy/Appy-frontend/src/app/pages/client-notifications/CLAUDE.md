# CLAUDE.md — Client Notifications Page (pages/client-notifications/)

Configures Instagram DM notifications sent to clients. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Components

- **`ClientNotificationsSettingsComponent`**: Single settings form with:
  - Instagram API access token input
  - Appointment confirmation message template textarea
  - Appointment reminder toggle; when enabled, shows hour/minute dropdowns for reminder send time and a reminder message template textarea

## Message Templates

Templates support these placeholders, resolved by the backend at send time:
- `{clientName}`, `{clientSurname}` — client's name
- `{service}` — service name
- `{date}`, `{time}` — appointment date and time

## Service

**`ClientNotificationsService`**: Two endpoints — `getSettings()` and `updateSettings(settings)`.

## Notes

This page is configuration-only — no list, no CRUD. The actual message sending is triggered from the appointments page (notify client action on a single appointment).
