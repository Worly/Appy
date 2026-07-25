# CLAUDE.md — Error Page (pages/error/)

Displays an HTTP error with a friendly message. No guard — publicly reachable.

`ErrorComponent` — stateless; reads the error payload from router state and redirects home when there is none (e.g. someone navigated here directly).
