# CLAUDE.md — Frontend Models (src/app/models/)

TypeScript classes wrapping backend DTOs. Two tiers: view models for read-only display, edit models for mutable forms with validation.

## Base Classes (base-model.ts)

- **`BaseModel`** — read-only container wrapping a raw DTO with typed accessors.
- **`EditModel<T>`** — mutable form model on top of `BaseModel`, adding per-property validators, `applyServerErrors()` for backend error codes, and the `@Children` decorator so nested `EditModel` arrays roll their validity up into the parent.

## Model Classes

| Class | Purpose |
|-------|---------|
| `AppointmentView` / `Appointment` | Read-only and editable appointment |
| `Client` / `ClientContact` | Client with its notification channels |
| `Service` | Service offering |
| `Facility` | Workspace id/name pair |
| `WorkingHour` | Operating range for one day of the week |
| `TimeOff` | Blocked-availability rule (carries its original `Holiday` snapshot when it is a materialized holiday) |
| `TimeOffOccurrence` | A single expanded on-date time-off instance |
| `FreeTime` | An available booking slot |
| `CalendarDay` | A date bundled with its appointments and working hours |
| `Holiday` | The immutable original snapshot of an imported public holiday |
| `HolidayListItem` | A holiday-list row, merging the snapshot with its current linked time-off state |
| `HolidayImportSettings` / `SupportedCountry` | Holiday import config and the country options for it |
| `ClientNotificationsSettings` | Instagram config and message templates |

## Enums

`AppointmentStatus` (+ `AppointmentStatusMap` for its icon and color class), `ClientContactType`, and `DayOfWeek`.

## Adding a Model

Extend `BaseModel` for display-only, `EditModel<T>` for forms. Declare validators in the constructor and apply `@Children` to nested `EditModel` arrays.
