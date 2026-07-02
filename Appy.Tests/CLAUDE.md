# CLAUDE.md — Unit Tests (Appy.Tests/)

xUnit unit tests for backend service logic. Targets **.NET 8.0**, same as the main project.

## What Is Tested

Tests live in `Services/` and `Utils/`. The `Services/` tests cover four services:

- **TrimmingStringConverterTests** (`Utils/`): verifies the global request-body string-trimming converter — leading/trailing whitespace is trimmed across top-level, nested, and collection string properties; `null` is preserved; whitespace-only becomes empty; and serialization (Write) is a passthrough that does not trim.

- **AppointmentReminderServiceTests**: verifies time-based reminder logic — which appointments get reminded based on date and time, that only `Confirmed` appointments trigger reminders, that the `WasReminded` flag prevents duplicate sends, and that an exception on one appointment does not stop reminders for others.

- **AppointmentServiceTests**: verifies the status-revert rule on `Edit` — a `Confirmed` appointment whose date, time, service, or client changes is reset to `Unconfirmed`; other statuses are preserved; duration- and notes-only edits leave the status alone. Also asserts that `AddNew` creates appointments in the `Unconfirmed` state. Also verifies that `GetList` returns an `AppointmentListPageDTO` envelope with the page's time-off occurrences, requests occurrences only for the dates of the returned appointments, and returns empty `TimeOffs` when the page is empty.

- **ClientNotificationServiceTests**: verifies contact validation (at least one contact required), Instagram IGSID lookup and `AppSpecificID` caching behavior, message template variable substitution (`{clientName}`, `{service}`, etc.), multi-contact routing (stops at the first successful send), and that a `LogLevel.Warning` is emitted when all contacts fail.

- **UserServiceTests**: verifies `Register` rejects malformed email addresses with a `ValidationException` (before the uniqueness check) and accepts well-formed ones.

- **HolidayServiceTests**: verifies `SaveSettings` and `Materialize` — new country materializes holidays in window and adds linked TimeOffs; past holidays (before today) are skipped; already-present dates are not re-added; changing country deletes only future ImportedHolidays + their TimeOffs (past rows survive as history); provider outage (HolidayProviderException) aborts before any SaveChangesAsync call. Also verifies `GetList` — active scope returns upcoming holidays ascending (excluding past), history scope excluded; `IsEdited` set when TimeOff has non-all-day time or date differs from original; `IsRemoved` set when no linked TimeOff; effective date uses TimeOff.StartDate over ImportedHoliday.Date. Verifies `GetById` — returns DTO with derived state, returns null for unknown id. Verifies `Edit` — mutates linked TimeOff fields in-place and calls SaveChangesAsync. Verifies `Remove` — calls TimeOffs.Remove on linked TimeOff, never removes ImportedHoliday, calls SaveChangesAsync. Verifies `Revert` — resets date and time fields to original snapshot while preserving notes. Verifies `Restore` — calls TimeOffs.Add with snapshot-derived TimeOff (IsAllDay, no notes, correct dates/label/ImportedHolidayId) when holiday has no linked TimeOff. Verifies `MaterializeForAllFacilities` — calls `Materialize` for each facility with a non-null CountryCode, skips null-country rows, and continues past a per-facility provider failure without throwing.

## How to Run

```bash
dotnet test                                                          # All tests
dotnet test --filter "FullyQualifiedName~AppointmentReminder"        # Single class
dotnet test --filter "FullyQualifiedName~SpecificMethodName"         # Single test
```

## Pattern

Each test creates a fresh service instance with Moq mocks for all dependencies. No database, no HTTP — all I/O is mocked. No integration tests exist yet.
