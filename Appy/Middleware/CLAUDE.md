# CLAUDE.md — Request Middleware (Middleware/)

Cross-cutting middleware not tied to one feature folder. (Auth, facility, and exception middleware live under `Auth/`, `Services/Facilities/`, and `Exceptions/`.)

## RequestLoggingMiddleware

The first application middleware, wrapping `ExceptionMiddleware`. Opens the `RequestId` correlation scope for the request and logs one summary line on completion (method, path, status, elapsed). Successful `/health` polls are suppressed.

See `Appy/CLAUDE.md` → Conventions for the level conventions and the other correlation scopes.
