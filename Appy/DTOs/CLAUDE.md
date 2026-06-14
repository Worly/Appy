# CLAUDE.md — Data Transfer Objects (DTOs/)

Plain C# records used to transfer data across the HTTP boundary. No business logic lives here — only properties.

## Naming Convention

- **Request DTOs**: named after the action (e.g. `LogInDTO`, `AppointmentEditDTO`)
- **Response DTOs**: named with `View` or `Response` suffix (e.g. `AppointmentViewDTO`, `LogInResponseDTO`)
- **Time-off DTOs**: `TimeOffDTO` represents the recurrence rule (CRUD); `TimeOffOccurrenceDTO` represents a single expanded on-date instance (views) and carries an `Id` (the source `TimeOff` rule's id), used by the frontend to dedupe occurrences that repeat across page boundaries

## Separation from Domain Entities

DTOs are intentionally shaped for the API consumer, not for the database:
- `AppointmentViewDTO` includes denormalized service/client names (not just IDs) so the frontend doesn't need secondary fetches
- Password fields never appear in any response DTO
- Internal fields like `WasReminded`, `PasswordHash`, `Salt`, and infrastructure timestamps are excluded from all responses

## Input Trimming

Strings in request-body DTOs are trimmed of leading/trailing whitespace during deserialization by the globally-registered `TrimmingStringConverter` (see `Utils/CLAUDE.md`). This applies to nested DTOs and collections automatically. Password fields (`LogInDTO.Password`, `RegisterDTO.Password`) opt out via `[JsonConverter(typeof(NoTrimStringConverter))]` because whitespace in a password is significant. Trimming happens on read only — write is a passthrough, so serialized responses are not affected.

## Direction Enum

`Direction` (`Forwards` / `Backwards`) lives here and is used by the appointment list pagination endpoint. `Forwards` means "from the given date onwards"; `Backwards` means "before the given date".

## AppointmentListPageDTO

Envelope returned by `GET /appointment/getList`. Contains `Appointments` (the page of `AppointmentViewDTO`) and `TimeOffs` (the `TimeOffOccurrenceDTO` occurrences covering that page's date span). Empty page → empty `TimeOffs`.
