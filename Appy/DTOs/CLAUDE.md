# CLAUDE.md — Data Transfer Objects (DTOs/)

Plain C# records used to transfer data across the HTTP boundary. No business logic lives here — only properties.

## Naming Convention

- **Request DTOs**: named after the action (e.g. `LogInDTO`, `AppointmentEditDTO`)
- **Response DTOs**: named with `View` or `Response` suffix (e.g. `AppointmentViewDTO`, `LogInResponseDTO`)
- **Time-off DTOs**: `TimeOffDTO` represents the recurrence rule (CRUD); when the rule is a materialized imported holiday it also carries the full `Holiday` (a `HolidayDTO`, populated only where the `ImportedHoliday` nav is loaded — e.g. `get/{id}`), so the frontend details view needs no second fetch. `TimeOffOccurrenceDTO` represents a single expanded on-date instance (views) and carries an `Id` (the source `TimeOff` rule's id), used by the frontend to dedupe occurrences that repeat across page boundaries. It also exposes `ToInterval()` — the one shared mapping from an occurrence to the blocked `(From, To)` wall-clock span (all-day → whole day) — reused by both the appointment free-time controller and `AppointmentService`

## Separation from Domain Entities

DTOs are intentionally shaped for the API consumer, not for the database:
- `AppointmentViewDTO` includes denormalized service/client names (not just IDs) so the frontend doesn't need secondary fetches
- Password fields never appear in any response DTO
- Internal fields like `WasReminded`, `PasswordHash`, `Salt`, and infrastructure timestamps are excluded from all responses

## Input Trimming

Strings in request-body DTOs are trimmed of leading/trailing whitespace during deserialization by the globally-registered `TrimmingStringConverter` (see `Utils/CLAUDE.md`). This applies to nested DTOs and collections automatically. Password fields (`LogInDTO.Password`, `RegisterDTO.Password`) opt out via `[JsonConverter(typeof(NoTrimStringConverter))]` because whitespace in a password is significant. Trimming happens on read only — write is a passthrough, so serialized responses are not affected.

## Direction Enum

`Direction` (`Forwards` / `Backwards`) lives here and is used by the appointment list pagination endpoint. `Forwards` means "from the given date onwards"; `Backwards` means "before the given date".

## Time Off Enums

`TimeOffListType` (`OneOff` / `Recurring`) and `TimeOffScope` (`Active` / `History`) are tokens for the time-off list endpoint (`GET /timeOff/getList`). `TimeOffListType` selects which tab of rules to retrieve; `TimeOffScope` selects the temporal filter (active rules vs. ended ones kept as history).

## AppointmentListPageDTO

Envelope returned by `GET /appointment/getList`. Contains `Appointments` (the page of `AppointmentViewDTO`) and `TimeOffs` (the `TimeOffOccurrenceDTO` occurrences for the dates that have appointments on that page — not every day in the min–max span). Empty page → empty `TimeOffs`.

## Holiday DTOs

- `HolidayImportSettingsDTO` — `{ CountryCode? }`: settings snapshot returned by get/save settings endpoints. Produced by `HolidayImportSettings.GetDTO()`.
- `HolidayListItemDTO` — lean list projection for `GET /holiday/getList`: `Id`, `Name`, `Date` (effective), `IsAllDay`, `TimeFrom?`, `TimeTo?`, `IsEdited`, `LinkedTimeOffId?`. Only what a row renders, plus the link for navigation. Built by `ImportedHoliday.GetListDTO(TimeOff?)`.
- `HolidayDTO` — full holiday view: `Id`, `Name`, `CountryCode`, `Date` (effective), `OriginalDate` (provider date), `IsAllDay`, `TimeFrom?`, `TimeTo?`, `Notes?`, `IsEdited`, `LinkedTimeOffId?` (null ⇒ removed). Built by `ImportedHoliday.GetDTO(TimeOff?)`. Used by `GET /holiday/get/{id}` and embedded in `TimeOffDTO.Holiday`.
- `HolidayEditDTO` — request body for editing a holiday's time/notes: `Date`, `IsAllDay`, `TimeFrom?`, `TimeTo?`, `Notes?` (Task 5).
