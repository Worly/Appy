# CLAUDE.md — Backend Services (Services/)

Business logic layer. Each service corresponds to one domain concept and is constructor-injected into controllers. Services have no knowledge of HTTP — they work only with domain entities, DTOs, and `AppDbContext`.

## Services at a Glance

| Service | Responsibility |
|---------|---------------|
| `UserService` | Registration, authentication, token refresh, logout |
| `JwtService` | JWT generation and validation (see `Auth/CLAUDE.md`) |
| `FacilityService` | Facility CRUD, selected-facility management per user |
| `ServiceService` | Service CRUD, archive toggle, name uniqueness enforcement |
| `ClientService` | Client CRUD, archive toggle, contact management with AppSpecificID preservation |
| `AppointmentService` | Appointment CRUD, free-time slot generation, status changes, client notification dispatch |
| `WorkingHourService` | Working-hour CRUD with overlap validation; replaces all hours for a facility atomically |
| `DashboardService` | Dashboard settings upsert (unique per user + facility) |
| `ClientNotificationsService` | Notification settings and outbound message dispatch |
| `AppointmentReminderService` | Cron job (every 5 minutes) — sends reminders for the next day's confirmed appointments |
| `TestingService` | Dev-only data seeder, reachable via `TestingController` |

## Sub-Folders

- `MessagingServices/` — Instagram API integration (see `MessagingServices/CLAUDE.md`)
- `SmartFilter/` — Dynamic LINQ filter DSL (see `SmartFilter/CLAUDE.md`)
- `Facilities/` — Facility middleware and ownership attribute (see `Facilities/CLAUDE.md`)

## Key Business Rules (enforced here, not in controllers)

- **Service/Client deletion blocked** if any `Appointment` references them — caller must archive instead
- **Appointment time validation**: the slot must fall within a `WorkingHour` range for that day-of-week and must not overlap an existing appointment. Pass `ignoreTimeNotAvailable=true` to bypass
- **Free-time generation**: 5-minute-interval slots within working hours, minus slots that would overlap existing appointments (and optionally ignoring one appointment ID for edit scenarios)
- **Reminder deduplication**: `AppointmentReminderService` only reminds once per appointment (`WasReminded` flag prevents repeats across scheduler ticks)
- **Contact name uniqueness**: `ClientService` enforces case-insensitive name + surname uniqueness per facility
- **AppSpecificID preservation**: when a client's contacts are updated, existing `AppSpecificID` values are re-attached by matching contact type + value, so cached IGSIDs survive edits
