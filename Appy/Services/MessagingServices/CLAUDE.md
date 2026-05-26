# CLAUDE.md — Messaging Services (Services/MessagingServices/)

External messaging integrations for client notifications. Currently Instagram is implemented; WhatsApp is stubbed.

## Architecture

`MessagingServiceManager` is the single entry point. It receives a `ContactType` and routes to the appropriate `IMessagingService` implementation. The access token (from `ClientNotificationsSettings`) is passed at call time, not injected at startup.

## Instagram Integration (InstagramMessagingService)

Uses the **Instagram Graph API v21.0** via two operations:

1. **IGSID lookup** (`GetAppSpecificUserID`): Paginates through the business account's conversations to find the Instagram-Scoped ID (IGSID) that corresponds to a given Instagram username. The IGSID is required for sending DMs.
2. **Message send**: POSTs to the `/{pageId}/messages` endpoint with the recipient's IGSID and message text.

## AppSpecificID Caching

The IGSID lookup scans conversations and may require multiple paginated API calls. Once found, the IGSID is written back to `ClientContact.AppSpecificID` in the database. All subsequent sends for that contact use the cached value directly, skipping the lookup.

If a cached IGSID is stale (e.g. the user unfollowed the business page), the service does not automatically re-attempt the lookup — the caller must handle failure.

## WhatsApp

`MessagingServiceManager` will throw if `ContactType.WhatsApp` is requested. Implementation is not yet built.
