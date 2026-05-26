# CLAUDE.md — Authentication & Authorization (Auth/)

JWT-based authentication with stateful refresh tokens supporting multi-device login.

## Token Lifecycle

- **Access token**: JWT (HS256), valid for **1 hour**, carries a `userId` claim
- **Refresh token**: opaque random string, valid for **7 days**, stored in the `LoginSession` database table
- **Token rotation**: every `/user/refresh` call issues a new refresh token and invalidates the old one
- **Family-based reuse detection**: each device session gets a unique `Family` UUID. If a refresh token that was already invalidated is presented, the entire family is invalidated — logging out all sessions in that family on all devices

## Components

| File | Role |
|------|------|
| `JwtService` | Generates and validates JWTs using `HS256` and `JwtSecret` from `ConfigurationService` |
| `JwtMiddleware` | Runs on every request; validates the Bearer token from the `Authorization` header and attaches the `User` entity to `HttpContext.Items["User"]` |
| `AuthorizeAttribute` | Action filter — returns 401 if no user is attached to the context |
| `AuthExtensions` | Adds a `CurrentUser()` extension method to `HttpContext` for retrieving the attached user |

## Password Hashing

PBKDF2-HMAC-SHA256 with 100,000 iterations and a random 256-bit salt per user. Both hash and salt are stored in the `User` entity. Pure .NET `Rfc2898DeriveBytes` — no external dependencies.

## No Role-Based Auth (Yet)

`AuthorizeAttribute` accepts an optional `roles` parameter but `GetRoles()` currently always returns empty — every authenticated user has equal access.
