# CLAUDE.md — Exception System (Exceptions/)

Custom exception hierarchy that maps to HTTP status codes. `ExceptionMiddleware` (registered in `Program.cs`) catches every `HttpException` and serializes it to a JSON response — controllers and services never catch these themselves.

## Hierarchy

```
HttpException  (base — StatusCode + Message string)
├── BadRequestException  (400)
├── NotFoundException    (404)
└── ValidationException  (400 — carries structured field errors via ErrorBuilder)
```

## ValidationException & ErrorBuilder

`ValidationException` wraps an `ErrorBuilder` that maps property names to error code strings:

```csharp
throw new ValidationException(
    new ErrorBuilder()
        .Add("email", "EMAIL_TAKEN")
        .Add("password", "TOO_SHORT")
);
```

The response body is a flat JSON object: `{ "email": "EMAIL_TAKEN", "password": "TOO_SHORT" }`.

The frontend `ErrorTranslateService` (see `Appy-frontend/src/app/shared/CLAUDE.md`) maps these error codes to localized user-facing strings.

## Usage Rule

Throw from **services** for business rule violations, and from **controllers** for request-level validation failures. Never catch these in a controller action — let `ExceptionMiddleware` handle all of them uniformly.
