# CLAUDE.md — Login Page (pages/login/)

Email/password sign-in. Reachable only when logged out (`NotLoggedInGuard`). No sub-routes; linked from the register page.

`LoginComponent` — one form calling `AuthService.logIn()`. Server validation errors are applied to the form model and shown inline. On success it routes to `/facilities` or the home page depending on whether the user already has a facility selected.
