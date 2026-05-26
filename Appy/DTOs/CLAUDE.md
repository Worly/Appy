# CLAUDE.md — Data Transfer Objects (DTOs/)

Plain C# records used to transfer data across the HTTP boundary. No business logic lives here — only properties.

## Naming Convention

- **Request DTOs**: named after the action (e.g. `LogInDTO`, `AppointmentEditDTO`)
- **Response DTOs**: named with `View` or `Response` suffix (e.g. `AppointmentViewDTO`, `LogInResponseDTO`)

## Separation from Domain Entities

DTOs are intentionally shaped for the API consumer, not for the database:
- `AppointmentViewDTO` includes denormalized service/client names (not just IDs) so the frontend doesn't need secondary fetches
- Password fields never appear in any response DTO
- Internal fields like `WasReminded`, `PasswordHash`, `Salt`, and infrastructure timestamps are excluded from all responses

## Direction Enum

`Direction` (`Forwards` / `Backwards`) lives here and is used by the appointment list pagination endpoint. `Forwards` means "from the given date onwards"; `Backwards` means "before the given date".
