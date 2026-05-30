# CLAUDE.md — Unit Tests (Appy.Tests/)

xUnit unit tests for backend service logic. Targets **.NET 8.0**, same as the main project.

## What Is Tested

Tests live in `Services/` and cover three services:

- **AppointmentReminderServiceTests**: verifies time-based reminder logic — which appointments get reminded based on date and time, that only `Confirmed` appointments trigger reminders, that the `WasReminded` flag prevents duplicate sends, and that an exception on one appointment does not stop reminders for others.

- **AppointmentServiceTests**: verifies the status-revert rule on `Edit` — a `Confirmed` appointment whose date, time, service, or client changes is reset to `Unconfirmed`; other statuses are preserved; duration- and notes-only edits leave the status alone. Also asserts that `AddNew` creates appointments in the `Unconfirmed` state.

- **ClientNotificationServiceTests**: verifies contact validation (at least one contact required), Instagram IGSID lookup and `AppSpecificID` caching behavior, message template variable substitution (`{clientName}`, `{service}`, etc.), and multi-contact routing (stops at the first successful send).

## How to Run

```bash
dotnet test                                                          # All tests
dotnet test --filter "FullyQualifiedName~AppointmentReminder"        # Single class
dotnet test --filter "FullyQualifiedName~SpecificMethodName"         # Single test
```

## Pattern

Each test creates a fresh service instance with Moq mocks for all dependencies. No database, no HTTP — all I/O is mocked. No integration tests exist yet.
