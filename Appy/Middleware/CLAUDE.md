# CLAUDE.md — Request Middleware (Middleware/)

Cross-cutting middleware that isn't tied to one feature folder. (Auth and facility middleware live under `Auth/` and `Services/Facilities/` respectively; the exception middleware lives under `Exceptions/`.)

## RequestLoggingMiddleware

Registered as the first application middleware — immediately before `ExceptionMiddleware`, after the framework infrastructure (HTTPS redirect, static-file/SPA serving, routing). It therefore wraps `ExceptionMiddleware` and covers all controller/API traffic, but intentionally does not log static-asset responses. For each request it:
- Opens a logging scope with `RequestId` = `HttpContext.TraceIdentifier`, so every log emitted while handling the request is correlated.
- Times the request and logs one summary line on completion: method, path, status code, elapsed ms.
- Picks the level by outcome: `< 500` → Information, `5xx` → Error.

See `Appy/CLAUDE.md` → Logging for the level conventions and the other correlation scopes (`UserId`, `FacilityId`).
