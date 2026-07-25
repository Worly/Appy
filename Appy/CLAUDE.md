# CLAUDE.md — Backend (Appy/)

ASP.NET Core 8 Web API. Serves the REST API and, in production, the pre-built Angular frontend as static files. It never builds the frontend — in development it doesn't serve it at all (`npx ng serve` does).

## Child CLAUDE.md Files

**Read the relevant CLAUDE.md before editing files in any of these folders:**

| Folder | CLAUDE.md |
|--------|-----------|
| `Domain/` | `Domain/CLAUDE.md` |
| `Controllers/` | `Controllers/CLAUDE.md` |
| `Services/` | `Services/CLAUDE.md` |
| `Services/MessagingServices/` | `Services/MessagingServices/CLAUDE.md` |
| `Services/SmartFilter/` | `Services/SmartFilter/CLAUDE.md` |
| `Services/Facilities/` | `Services/Facilities/CLAUDE.md` |
| `DTOs/` | `DTOs/CLAUDE.md` |
| `Auth/` | `Auth/CLAUDE.md` |
| `Exceptions/` | `Exceptions/CLAUDE.md` |
| `Utils/` | `Utils/CLAUDE.md` |
| `Middleware/` | `Middleware/CLAUDE.md` |

## Request Pipeline (order matters)

```
Request
  → RequestLoggingMiddleware      (Middleware/)
  → ExceptionMiddleware           (Exceptions/)
  → JwtMiddleware                 (Auth/)
  → FacilityMiddleware            (Services/Facilities/)
  → [Authorize]                   (Auth/)
  → [SelectedFacility]            (Services/Facilities/)
  → Controller Action
```

## Conventions

- **DI** — application services are registered Scoped in `Program.cs`. Scheduled work is the exception: `IScheduledJob` implementations run under the `CronScheduler.AspNetCore` hosted scheduler.
- **Config** — `appsettings*.json` + User Secrets in development, environment variables (UPPER_SNAKE_CASE) in production. Inject `IConfiguration`.
- **Logging** — `Microsoft.Extensions.Logging`, providers configured in `Program.cs`, per-category levels in `appsettings*.json`. The `RequestId` / `UserId` / `FacilityId` correlation scopes come from middleware — never repeat those ids in a message. Debug = diagnostics, Information = business events, Warning = handled failures and security signals, Error = unexpected. Always message templates, never string interpolation.
- **Database** — PostgreSQL via EF Core, single `MainDbContext` (`Domain/`). Migrations in `Migrations/` are generated; never hand-edit them.

## Health Check

`GET /health` — polled by CI and the Docker healthcheck to wait for readiness.
