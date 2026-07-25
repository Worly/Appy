# CLAUDE.md — Appointments Page (pages/appointments/)

The primary page of the app. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

```
/appointments          → AppointmentsComponent
/appointments/new      → AppointmentEditComponent
/appointments/edit/:id → AppointmentEditComponent
```

`?date=YYYY-MM-DD` and `?filter=<SmartFilterJSON>` are read and written reactively, so the view is always shareable and bookmarkable.

## Components

| Component | Purpose |
|-----------|---------|
| `AppointmentsComponent` | Top-level container — date selector, view switcher, and filter dialog. The chosen view (scroller or list) persists in LocalStorage |
| `AppointmentsScrollerComponent` | Calendar-style single-day view with time lanes, animated date transitions, and smart-cached adjacent days |
| `SingleDayAppointmentsComponent` | Renders one day's appointments as positioned blocks inside the scroller |
| `AppointmentsListComponent` | Chronological list with date dividers, infinite-scrolling both directions from the current date |
| `SingleAppointmentListItemComponent` | One row in the list view |
| `SingleAppointmentComponent` | Detail panel for one appointment, including the status control and the notify-client action |
| `AppointmentEditComponent` | Create/edit form — client and service lookups, duration, date-time chooser, notes, and time-conflict confirmation |
| `DateTimeChooserComponent` | Modal combining a calendar picker with a grid of available time slots |
| `TimeButtonComponent` | One available time-slot button |
| `AppointmentStatusIconsComponent` / `AppointmentStatusLookupComponent` | Status display and status picker |

Both views also render time-off occurrences — as hatched bands in the scroller, as inline rows and day-divider badges in the list — and open the time-off details dialog when one is clicked. In the list, both time-offs and idle/overlap gaps between adjacent appointments come from the shared `utils/list-timeline.ts` helpers.

## Services

| Service | Purpose |
|---------|---------|
| `AppointmentService` | Appointment CRUD plus `getAll` (scroller), `getList` (cursor-paged list, appointments and their time-offs in one response), `getFreeTimes`, `setStatus`, and `notifyClient` |
| `CalendarDayService` | Fetches a full `CalendarDay` (appointments + working hours for a date) for the scroller |
| `appointment-status-info.pipe.ts` | Maps a status to its display info |

## Cross-Module Dependencies

Imports `ClientsModule` (`ClientLookupComponent`), `ServicesModule` (`ServiceLookupComponent`), and `TimeOffModule` (`SingleTimeOffComponent`, `AllDayTimeOffPickerComponent`). Exports `SingleAppointmentComponent`, consumed by `DashboardModule`.
