# CLAUDE.md — Login Page (pages/login/)

Email/password authentication page. Accessible only when not logged in (`NotLoggedInGuard`).

## Behavior

On successful login, redirects to `/facilities` if the user has no selected facility, otherwise to the home page (`/appointments`). Server validation errors (e.g. wrong password) are applied to the form model and displayed inline.

## Components

- **`LoginComponent`**: Single form with email and password fields. Calls `AuthService.logIn()`. Shows a loading state on the button during the request.

## Notes

No sub-routes. Linked from the register page.
