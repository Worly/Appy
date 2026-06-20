# CLAUDE.md — Request Middleware (Middleware/)

Cross-cutting middleware. See `Appy/CLAUDE.md` for the full pipeline (expanded in Task 10).

## RequestLoggingMiddleware

Outermost middleware. Opens a logging scope with `RequestId` (= `HttpContext.TraceIdentifier`) and logs one summary line per request (method, path, status, elapsed ms). Information for `< 500`, Error for `5xx`.
