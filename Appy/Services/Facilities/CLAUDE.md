# CLAUDE.md — Facilities (Services/Facilities/)

The facility service plus the two mechanisms that attach and validate the active Facility for each request.

| File | Role |
|------|------|
| `FacilityService` | Facility CRUD and per-user selected-facility management |
| `FacilityMiddleware` | Reads the `facility-id` header on every request and stores it in `HttpContext.Items` |
| `SelectedFacilityAttribute` | Action filter for facility-scoped endpoints — loads the Facility, verifies the authenticated user owns it, and stores the validated entity for the controller |
| `FacilitiesExtensions` | `HttpContext` accessors for the current facility |

Centralizing ownership here means controllers and services receive a pre-validated `Facility` and never repeat the check.
