# CLAUDE.md — API Controllers (Controllers/)

REST API surface. Each controller maps to one domain concept and delegates all work to its injected service. Controllers contain no business logic.

## Authentication Pattern

All controllers carry `[Authorize]` (requires a valid JWT from the pipeline) except `UserController` (login/register are public). Most also carry `[SelectedFacility]` (requires a valid, user-owned facility in the `facility-id` header).

`TestingController` has no auth and is only used in development to seed test data.

## Special HTTP Protocol

**Request header**: `facility-id: <int>` — required on all `[SelectedFacility]` endpoints  
**Response header**: `X-Can-Notify-Client: true` — added by `AppointmentController` when the returned appointment's client has at least one notifiable contact and the facility has a valid notification configuration

## Controller → Route Prefix

| Controller | Prefix |
|-----------|--------|
| `UserController` | `/user` |
| `FacilityController` | `/facility` |
| `ServiceController` | `/service` |
| `ClientController` | `/client` |
| `AppointmentController` | `/appointment` |
| `WorkingHourController` | `/workinghour` |
| `CalendarDayController` | `/calendarday` |
| `DashboardController` | `/dashboard` |
| `ClientNotificationsController` | `/clientnotifications` |
| `TestingController` | `/testing` |

## Error Handling

Controllers throw `HttpException` subclasses (from `Exceptions/`) for validation and business rule violations. They never catch exceptions — `ExceptionMiddleware` converts them to JSON responses uniformly.

## Appointment-Specific Notes

- `GET /appointment/getAll` and `GET /appointment/getList` accept a `filter` query parameter in Smart Filter DSL format (see `Services/SmartFilter/CLAUDE.md`)
- `getList` supports pagination: `direction` (Forwards/Backwards), `skip`, `take`
- `addNew` and `edit` accept `ignoreTimeNotAvailable=true` to bypass time validation
- `notifyClient/{id}` accepts a `languageCode` query parameter to select the message language
