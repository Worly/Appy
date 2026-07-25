# CLAUDE.md — Client Notifications Page (pages/client-notifications/)

Configures the Instagram DMs sent to clients. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Component

`ClientNotificationsSettingsComponent` — one settings form: the Instagram access token, the confirmation message template, and the reminder toggle with its send time and template.

Message templates carry placeholders that the backend substitutes at send time (see `Appy/Services/MessagingServices/CLAUDE.md`).

## Service

`ClientNotificationsService` — reads and writes the settings.

This page is configuration only. Sending is triggered from the appointments page.
