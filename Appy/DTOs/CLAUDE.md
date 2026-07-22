# CLAUDE.md — Data Transfer Objects (DTOs/)

Plain C# records used to transfer data across the HTTP boundary. No business logic lives here — only properties.

## Naming Convention

- **Request DTOs**: named after the action (e.g. `LogInDTO`, `AppointmentEditDTO`)
- **Response DTOs**: named with `View` or `Response` suffix (e.g. `AppointmentViewDTO`, `LogInResponseDTO`)
- **Time-off DTOs**: `TimeOffDTO` represents the recurrence rule (CRUD); when the rule is a materialized imported holiday it also carries its `Holiday` (a `HolidayDTO` — the **original** provider snapshot; the TimeOff itself carries the edited values), populated only where the `ImportedHoliday` nav is loaded (e.g. `get/{id}`), so the frontend derives edited/removed state and needs no second fetch. `TimeOffOccurrenceDTO` represents a single expanded on-date instance (views) and carries an `Id` (the source `TimeOff` rule's id), used by the frontend to dedupe occurrences that repeat across page boundaries. It also exposes `ToInterval()` — the one shared mapping from an occurrence to the blocked `(From, To)` wall-clock span (all-day → whole day) — reused by both the appointment free-time controller and `AppointmentService`

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

Envelope returned by `GET /appointment/getList`. Contains `Appointments` (the page of `AppointmentViewDTO`) and `TimeOffs` (the `TimeOffOccurrenceDTO` occurrences for every content-day in the window — not just the days that have appointments; empty when a filter is active or the page is empty). `NextCursor` / `PrevCursor` are nullable dates that continue the list forwards/backwards from this page; null at the respective end of the list (forward is unbounded, so `NextCursor` is null once no content remains ahead; `PrevCursor` is null once no content remains behind).

## Holiday DTOs

- `HolidayImportSettingsDTO` — `{ CountryCode? }`: settings snapshot returned by get/save settings endpoints. Produced by `HolidayImportSettings.GetDTO()`.
- `HolidayListDTO` — merged list projection for `GET /holiday/getList`: `Id`, `Name`, `Date` (effective), `IsAllDay`, `TimeFrom?`, `TimeTo?`, `IsEdited`, `LinkedTimeOffId?` (null ⇒ removed). The ImportedHoliday flattened with its linked TimeOff's current state — what a row renders plus the link. Built by `ImportedHoliday.GetListDTO()` (reads its `LinkedTimeOff` nav).
- `HolidayDTO` — the **original** provider snapshot, 1:1 with the `ImportedHoliday` row: `Id`, `Name`, `CountryCode`, `Date`. Built by `ImportedHoliday.GetDTO()`. Embedded in `TimeOffDTO.Holiday` (the TimeOff carries the edits) and returned by `GET /holiday/get/{id}` for the removed-holiday view.
- Editing/removing a holiday reuses `TimeOffDTO` via `TimeOffController` (a holiday is a one-off TimeOff), so there is no holiday-specific edit DTO.
