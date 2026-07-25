# CLAUDE.md — Authentication & Authorization (Auth/)

JWT access tokens paired with stateful refresh tokens stored as `LoginSession` rows, supporting multi-device login with rotation and reuse detection.

## Files

| File | Role |
|------|------|
| `JwtService` | Generates and validates access tokens |
| `JwtMiddleware` | Validates the `Authorization` Bearer token and attaches the `User` to the request |
| `AuthorizeAttribute` | Action filter — 401 when no user is attached |
| `AuthExtensions` | `HttpContext.CurrentUser()` for retrieving the attached user |

Password hashing (PBKDF2-HMAC-SHA256, per-user salt) lives in `UserService`, not here.

## No Role-Based Auth

`AuthorizeAttribute` takes an optional roles parameter, but no roles exist yet — every authenticated user has equal access.
