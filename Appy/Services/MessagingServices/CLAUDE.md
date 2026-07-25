# CLAUDE.md — Messaging Services (Services/MessagingServices/)

External messaging integrations for client notifications.

| File | Role |
|------|------|
| `MessagingServiceManager` | The single entry point — routes a send to the right `IMessagingService` by `ContactType` |
| `IMessagingService` | The per-channel contract: resolve a contact's app-specific id, send a message |
| `InstagramMessagingService` | Instagram Graph API — IGSID lookup and DM send |

WhatsApp is not implemented; requesting it throws.

The access token comes from `ClientNotificationsSettings` and is passed at call time, not injected at startup. Resolved IGSIDs are cached back onto `ClientContact.AppSpecificID` so later sends skip the lookup.
