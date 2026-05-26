# CLAUDE.md — Facility Middleware (Services/Facilities/)

Two mechanisms that attach and validate the active Facility for each HTTP request.

## FacilityMiddleware

Runs on every request as part of the ASP.NET Core middleware pipeline. Reads the `facility-id` integer header and stores its value in `HttpContext.Items`. This makes the facility ID available downstream without each controller needing to parse the header.

## SelectedFacilityAttribute

An `IAsyncActionFilter` applied to controllers or individual actions that require an active, user-owned facility. It:
1. Reads the facility ID stored by `FacilityMiddleware`
2. Returns **400 Bad Request** if no `facility-id` header was provided
3. Loads the `Facility` from the database and checks that the authenticated user is its owner
4. Returns **404 Not Found** if the facility doesn't belong to the user
5. Stores the validated `Facility` entity in `HttpContext.Items` so the controller can use it directly

## Why a Filter Instead of Per-Service Checks?

Ownership must be verified on every scoped request. Centralizing this in a filter means controllers and services receive a pre-validated `Facility` and don't repeat ownership logic.
