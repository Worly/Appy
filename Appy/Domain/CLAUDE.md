# CLAUDE.md — Domain Entities (Domain/)

EF Core entity classes that map directly to PostgreSQL tables. These are the canonical data models for the backend — all business logic in `Services/` operates on these objects.

## Entity Overview

| Entity | Purpose |
|--------|---------|
| `User` | Account owner with email/password credentials and a pointer to their selected facility |
| `LoginSession` | One active refresh token per device/browser; enables multi-device login |
| `Facility` | The core tenant unit — a named workspace owned by a User |
| `Service` | A service offering at a Facility (e.g. "Haircut"), with name, duration, color, and archive flag |
| `Client` | A customer of a Facility, with optional contacts and archive flag |
| `ClientContact` | A single notification channel for a Client (Instagram username or WhatsApp number) |
| `Appointment` | A booking linking one Client + one Service at a specific date/time, with status |
| `WorkingHour` | Operating hours for a Facility on a specific day of the week (one time range per day) |
| `TimeOff` | Blocked availability (recurrence: OneOff/Weekly/Monthly; all-day or time range; optional bounds) |
| `DashboardSettings` | Per-user per-facility UI preferences stored as a JSON blob |
| `ClientNotificationsSettings` | Instagram API config and message templates for a Facility |
| `HolidayImportSettings` | Per-facility holiday import config: ISO country code (null = off); PK = FacilityId. `GetDTO()` maps to `HolidayImportSettingsDTO` |
| `ImportedHoliday` | One row per materialized public holiday occurrence; persists independently of its linked TimeOff. `GetDTO()` returns the original snapshot as a `HolidayDTO` (1:1 with this row); `GetListDTO(TimeOff?)` merges it with the linked TimeOff's current state into a `HolidayListDTO` (`LinkedTimeOffId == null` ⇒ removed) |

## Multi-Tenancy Pattern

Every data entity except `User` and `LoginSession` carries a `FacilityId` foreign key. All queries in the service layer filter by `FacilityId` to enforce tenant isolation.

## Key Relationships

- `User` → many `Facility` (via `OwnerId`)
- `User` → many `LoginSession`
- `Facility` → many `Service`, `Client`, `Appointment`, `WorkingHour`
- `Facility` → one `ClientNotificationsSettings`
- `Facility` → one `HolidayImportSettings`, many `ImportedHoliday`
- `TimeOff` → optional one `ImportedHoliday` (nullable FK, NoAction delete — removing a TimeOff does not delete the ImportedHoliday)
- `Client` → many `ClientContact` (auto-included in all EF queries via `modelBuilder`)
- `Appointment` → one `Service`, one `Client` — delete behavior is **NoAction**: appointments must be deleted before their referenced service/client can be deleted

## Soft Deletes

`Service` and `Client` have `IsArchived: bool`. Hard deletion is blocked at the service layer if any appointment references them. Archiving is the intended path for removing active records.

## Special Fields

- `Appointment.WasReminded` — set `true` after a reminder is sent; prevents the scheduler from sending duplicate reminders
- `Appointment.Status` — enum: `Unconfirmed`, `Confirmed`, `NoShow`
- `ClientContact.AppSpecificID` — cached Instagram IGSID, stored after first lookup to avoid repeated API pagination
- `LoginSession.Family` — unique token family UUID; the entire family is invalidated when a refresh token reuse is detected
- `DashboardSettings.SettingsJSON` — untyped JSON blob for flexible per-facility UI preferences
