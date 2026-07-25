# CLAUDE.md — Global App Services (src/app/services/)

App-level singletons provided in `AppModule`, not tied to any page or domain entity.

| Service | Purpose |
|---------|---------|
| `AppInitializerService` | Owns all one-time startup work in the `APP_INITIALIZER` phase — dayjs plugins and locales, language preference, auth token restore. Nothing else in the app may bootstrap dayjs or load auth state |
| `ColorSchemeService` | The active theme (`light` / `dark` / `follow-os`), persisted and applied as a class on `document.body` (see `src/styles/CLAUDE.md`) |
| `CustomReuseStrategy` | Angular `RouteReuseStrategy` that keeps components alive when navigating away, so returning restores their scroll and data. Routes opt in via `data: { shouldDetach, detachGroup }`. Cleared on facility switch and logout so a new tenant never sees cached components |
| `AttachDetachHooksService` | Invokes `ngBeforeAttach` / `ngAfterAttach` / `ngBeforeDetach` on components that implement them during cache/restore cycles |
