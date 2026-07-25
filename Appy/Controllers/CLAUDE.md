# CLAUDE.md — API Controllers (Controllers/)

The REST surface. Each controller maps to one domain concept and delegates everything to its injected service — no business logic, no exception catching (`ExceptionMiddleware` handles all of it).

## Controllers

| Controller | Route Prefix | Serves |
|-----------|--------------|--------|
| `UserController` | `/user` | Register, login, refresh, logout (the only public controller) |
| `FacilityController` | `/facility` | Facility CRUD and selection |
| `ServiceController` | `/service` | Service CRUD and archiving |
| `ClientController` | `/client` | Client CRUD and archiving |
| `AppointmentController` | `/appointment` | Appointment CRUD, list paging, free times, status, client notification |
| `WorkingHourController` | `/workinghour` | Working-hour read and atomic replace |
| `TimeOffController` | `/timeoff` | Time-off CRUD and list paging (imported holidays edit through here too) |
| `HolidayController` | `/holiday` | Holiday import settings, list, revert/restore |
| `CalendarDayController` | `/calendarday` | A date bundled with its appointments and working hours (scroller view) |
| `DashboardController` | `/dashboard` | Dashboard settings and stat endpoints |
| `ClientNotificationsController` | `/clientnotifications` | Notification settings |
| `TestingController` | `/testing` | Dev-only test-data seeding — no auth |

## Conventions

- `[Authorize]` on every controller except `UserController` and `TestingController`; `[SelectedFacility]` on everything facility-scoped.
- **Request header** `facility-id: <int>` — required by every `[SelectedFacility]` endpoint.
- **Response header** `X-Can-Notify-Client: true` — set by `AppointmentController` when the appointment's client is notifiable.
- Appointment and time-off list endpoints accept a `filter` query parameter in Smart Filter DSL format (see `Services/SmartFilter/CLAUDE.md`).
