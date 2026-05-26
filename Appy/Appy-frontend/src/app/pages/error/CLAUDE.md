# CLAUDE.md — Error Page (pages/error/)

Displays HTTP errors with a user-friendly message. No auth guard — publicly accessible.

## Behavior

Reads the error status code and message from router state. If no error state is present (e.g. navigated to directly), redirects to the home page. Displays the status code alongside a friendly description.

## Components

- **`ErrorComponent`**: Stateless display component. Reads router navigation extras for the error payload.
