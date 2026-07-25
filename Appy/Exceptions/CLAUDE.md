# CLAUDE.md — Exception System (Exceptions/)

A custom exception hierarchy mapping to HTTP status codes, plus `ExceptionMiddleware`, which serializes every `HttpException` to JSON and turns any unhandled exception into a generic 500 that leaks nothing.

## Hierarchy

```
HttpException  (base — status code + message)
├── BadRequestException  (400)
├── NotFoundException    (404)
└── ValidationException  (400 — structured per-field errors via ErrorBuilder)
```

`ValidationException` carries an `ErrorBuilder` mapping property names to error-code strings, serialized as a flat JSON object. The frontend's `ErrorTranslateService` (see `Appy-frontend/src/app/shared/CLAUDE.md`) turns those codes into localized text.

## Usage Rule

Throw from **services** for business-rule violations and from **controllers** for request-level validation. Never catch them — `ExceptionMiddleware` handles all of them uniformly.
