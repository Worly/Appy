# CLAUDE.md — Backend Services (Services/)

The business-logic layer. One service per domain concept, constructor-injected into controllers. Services know nothing about HTTP — they work with domain entities, DTOs, and `MainDbContext`, and throw `HttpException` subclasses for rule violations.

## Services

| Service | Responsibility |
|---------|---------------|
| `UserService` | Registration, authentication, token refresh, logout |
| `ServiceService` | Service CRUD and archiving |
| `ClientService` | Client CRUD, archiving, and contact management |
| `AppointmentService` | Appointment CRUD, list paging, free-time slot generation, status changes, notification dispatch |
| `WorkingHourService` | Working-hour CRUD; replaces a facility's hours atomically |
| `DashboardService` | Dashboard settings and stat queries |
| `ClientNotificationsService` | Notification settings and outbound message dispatch |
| `AppointmentReminderService` | Scheduled job — reminders for the next day's confirmed appointments |
| `TimeOffService` | Time-off CRUD, list paging, and occurrence expansion (recurrence → concrete dates) |
| `HolidayService` | Public-holiday import: settings, materialization, list, revert/restore |
| `HolidayImportScheduledJob` | Scheduled job — daily holiday materialization across all facilities |
| `TestingService` | Dev-only data seeder |

A materialized holiday is a plain one-off `TimeOff`, so **editing and deleting one goes through `TimeOffService`**, not `HolidayService`.

## Sub-Folders

- `MessagingServices/` — Instagram/WhatsApp integration (see its CLAUDE.md)
- `SmartFilter/` — the filter DSL compiler (see its CLAUDE.md)
- `Facilities/` — facility service, middleware, and ownership attribute (see its CLAUDE.md)
- `Holidays/` — `IHolidayProvider` and its `NagerDateHolidayProvider` implementation, the external source `HolidayService` imports from

`JwtService` lives in `Auth/`, not here.

## Business Rules Live Here, Not in Controllers

Appointment time validation, free-time generation, service/client deletion blocking, contact uniqueness, reminder deduplication, and holiday import windows are all enforced in this layer. Read the service for the specifics.
