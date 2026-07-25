# CLAUDE.md — Data Transfer Objects (DTOs/)

Plain C# records carrying data across the HTTP boundary. Properties only — no logic. Domain entities build them via their `GetDTO()`-style methods (see `Domain/CLAUDE.md`).

## Naming

- **Request DTOs** are named after the action — `LogInDTO`, `AppointmentEditDTO`.
- **Response DTOs** carry a `View` or `Response` suffix — `AppointmentViewDTO`, `LogInResponseDTO`.
- **Page envelopes** carry a `PageDTO` suffix — `AppointmentListPageDTO` wraps a page of appointments with its time-offs and cursors.

## Shape Rules

DTOs are shaped for the API consumer, not the database. View DTOs denormalize names so the frontend needs no secondary fetch; passwords, hashes, and internal bookkeeping fields never appear in a response.

## Input Trimming

Strings in request bodies are trimmed during deserialization by the globally-registered `TrimmingStringConverter`; password fields opt out via `NoTrimStringConverter`. See `Utils/CLAUDE.md`.

## Enums

`Direction` (appointment list paging), `TimeOffListType`, and `TimeOffScope` (time-off list tabs and temporal filter) live here — they are API-facing query tokens, mirrored by the frontend.
