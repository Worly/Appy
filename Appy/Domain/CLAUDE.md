# CLAUDE.md — Domain Entities (Domain/)

EF Core entities mapped to PostgreSQL tables, plus `MainDbContext`. These are the canonical backend data models — everything in `Services/` operates on them.

## Entities

| Entity | Purpose |
|--------|---------|
| `User` | Account owner (credentials + selected facility) |
| `LoginSession` | One refresh token per device; enables multi-device login |
| `Facility` | The tenant unit — a workspace owned by a User |
| `Service` | A service offering at a Facility (e.g. "Haircut") |
| `Client` | A customer of a Facility |
| `ClientContact` | One notification channel for a Client (Instagram / WhatsApp) |
| `Appointment` | A booking linking one Client + one Service at a date/time |
| `WorkingHour` | Operating hours for a Facility on one day of the week |
| `TimeOff` | Blocked availability, one-off or recurring |
| `DashboardSettings` | Per-user per-facility UI preferences |
| `ClientNotificationsSettings` | Instagram API config and message templates for a Facility |
| `HolidayImportSettings` | Per-facility public-holiday import config |
| `ImportedHoliday` | One materialized public-holiday occurrence — the immutable original snapshot |

## Multi-Tenancy

Every entity except `User` and `LoginSession` carries a `FacilityId`. The service layer filters by it on every query to enforce tenant isolation.

## Relationships

- `User` → many `Facility`, many `LoginSession`
- `Facility` → many `Service`, `Client`, `Appointment`, `WorkingHour`, `TimeOff`, `ImportedHoliday`; one `ClientNotificationsSettings`; one `HolidayImportSettings`
- `Client` → many `ClientContact`
- `Appointment` → one `Service`, one `Client` (NoAction delete — see Soft Deletes)
- `TimeOff` ↔ `ImportedHoliday` — optional 1:1. A materialized holiday *is* a one-off `TimeOff`; the `ImportedHoliday` keeps the original snapshot and outlives its TimeOff.

## Soft Deletes

`Service` and `Client` have `IsArchived`. Hard deletion is blocked in the service layer while an `Appointment` references them — archiving is the intended path.
