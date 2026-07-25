# CLAUDE.md — Unit Tests (Appy.Tests/)

xUnit tests for backend logic. Targets .NET 8.0, same as the main project. Folders mirror the backend: `Services/`, `Controllers/`, `Utils/`, `Middleware/`, `Exceptions/`.

## Covered

| Test class | Covers |
|-----------|--------|
| `AppointmentServiceTests` | Appointment create/edit rules and list paging |
| `AppointmentReminderServiceTests` | Which appointments get reminded, and deduplication |
| `ClientNotificationServiceTests` | Contact resolution, template substitution, multi-contact routing |
| `UserServiceTests` | Registration validation |
| `HolidayServiceTests` | Holiday import, listing, revert and restore |
| `TimeOffServiceTests` | Time-off CRUD, recurrence handling, occurrence expansion |
| `NagerDateHolidayProviderTests` | The external holiday provider client |
| `DashboardControllerTests` | Dashboard endpoint response shapes |
| `TrimmingStringConverterTests` | Request-body string trimming |
| `RequestLoggingMiddlewareTests` | Request summary logging and its suppression rules |
| `ExceptionMiddlewareTests` | Exception-to-HTTP-response mapping and log severity |

`SmartFilterParserTests` lives in the main project, under `Appy/Services/SmartFilter/`.

Editing or removing a holiday is covered by `TimeOffServiceTests`, not `HolidayServiceTests` — a holiday is a one-off `TimeOff`.

## Pattern

Every test builds a fresh service with Moq mocks for all dependencies. No database, no HTTP, no integration tests.

```bash
dotnet test                                                    # all
dotnet test --filter "FullyQualifiedName~AppointmentReminder"  # one class or test
```
