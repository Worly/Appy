# CLAUDE.md — Register Page (pages/register/)

New user account creation. Accessible only when not logged in (`NotLoggedInGuard`).

## Behavior

Form with name, surname, email, and password fields. Calls `AuthService.register()`. Server validation errors (e.g. email already taken) are applied to the form model and displayed inline. On success, the user is logged in and redirected to `/facilities`.

## Components

- **`RegisterComponent`**: Single registration form. Shows a loading state on the button during the request.

## Notes

No sub-routes. Linked from the login page.
