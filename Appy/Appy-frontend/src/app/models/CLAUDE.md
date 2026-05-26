# CLAUDE.md — Frontend Models (src/app/models/)

TypeScript classes representing domain data on the frontend. Split into two tiers: view models (read-only display) and edit models (mutable forms with validation).

## Base Class System (base-model.ts)

**`BaseModel`**: Read-only data container wrapping a raw DTO with typed accessors.

**`EditModel<T>`** (extends `BaseModel`): Mutable form model with:
- **Validation**: properties declare validators in the constructor; `isValid()` checks all
- **Server error application**: `applyServerErrors(errors)` maps backend error code objects to the corresponding property
- **`@Children` decorator**: marks array properties whose items are themselves `EditModel` instances; nested validation rolls up into the parent's `isValid()`

## Domain Model Classes

| Class | Counterpart DTO | Purpose |
|-------|----------------|---------|
| `AppointmentView` | `AppointmentViewDTO` | Read-only appointment for display |
| `Appointment` | `AppointmentDTO` | Editable appointment for create/edit forms |
| `Client` | `ClientDTO` | Client with nested `ClientContact` array |
| `ClientContact` | `ClientContactDTO` | Single notification channel |
| `Service` | `ServiceDTO` | Service offering |
| `Facility` | (inline) | Simple id/name pair |
| `WorkingHour` | `WorkingHourDTO` | Operating range for one day of the week |
| `FreeTime` | `FreeTimeDTO` | Available booking slot (from/to/toIncludingDuration) |
| `CalendarDay` | `CalendarDayDTO` | A date bundled with its appointments and working hours |
| `ClientNotificationsSettings` | (settings DTO) | Instagram config and message templates |

## Enums

- `AppointmentStatus`: `Confirmed`, `Unconfirmed`, `NoShow`
- `AppointmentStatusMap`: maps each status to its display icon and CSS color class
- `ClientContactType`: `Instagram`, `WhatsApp`
- `DayOfWeek`: Sunday–Saturday with `weekdayOrder()` for Monday-first display ordering

## Adding a New Model

Extend `BaseModel` for display-only. Extend `EditModel<T>` for forms. Declare validators in the constructor. Apply `@Children` to any nested `EditModel` arrays so their validity rolls up.
