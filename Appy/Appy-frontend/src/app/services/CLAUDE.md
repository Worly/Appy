# CLAUDE.md — Global App Services (src/app/services/)

App-level singleton services not tied to any specific page or domain entity. These are provided in `AppModule` and shared across the entire application.

## AppInitializerService

Runs during Angular's `APP_INITIALIZER` phase — before any component renders. Owns all one-time startup work:
1. Registers dayjs plugins (`duration`, `customParseFormat`, `isBetween`, `isSameOrBefore`, `isSameOrAfter`)
2. Sets up dayjs locales for `en-gb` and `hr`, both with Monday as the first day of the week
3. Loads the saved language preference from LocalStorage and activates it
4. Loads saved auth tokens from LocalStorage, validates them, and refreshes if needed
5. On unrecoverable failure, redirects to `/error`

Nothing else in the app should bootstrap dayjs or load auth state — this service owns both.

## ColorSchemeService

Manages the active visual theme: `light`, `dark`, or `follow-os` (tracks the `prefers-color-scheme` media query). Persists the choice to LocalStorage. Applies the theme by toggling `light-theme` / `dark-theme` CSS classes on `document.body`. See `src/styles/CLAUDE.md` for how the CSS variable theming works.

## RouteReuseStrategy & AttachDetachHooksService

A custom `RouteReuseStrategy` caches Angular components in memory when the user navigates away, then restores them on return (preserving scroll position and loaded data). Routes opt in via `data: { shouldDetach: true, detachGroup: "<name>" }` (e.g. the clients and services list routes). `CustomReuseStrategy` also exposes `clear()`, which destroys all cached components; it is called on facility switch / logout so a new tenant never sees a previous tenant's cached list components.

`AttachDetachHooksService` calls `ngBeforeAttach` / `ngAfterAttach` / `ngBeforeDetach` lifecycle hooks on components that implement them, for custom behaviour during cache/restore cycles. The cached list components no longer implement `ngBeforeAttach` to refetch — TanStack invalidation refreshes them in the background while they remain subscribed (detached but alive), so no explicit refetch on re-attach is needed.
