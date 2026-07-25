# CLAUDE.md — Register Page (pages/register/)

New account creation. Reachable only when logged out (`NotLoggedInGuard`). No sub-routes; linked from the login page.

`RegisterComponent` — one form calling `AuthService.register()`. Server validation errors are applied to the form model and shown inline. On success the user is logged in and sent to `/facilities`.
