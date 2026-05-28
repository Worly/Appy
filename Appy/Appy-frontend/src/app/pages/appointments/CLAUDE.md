# CLAUDE.md — Appointments Page (pages/appointments/)

The primary page of the app. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

```
/appointments          → AppointmentsComponent (main view)
/appointments/new      → AppointmentEditComponent
/appointments/edit/:id → AppointmentEditComponent
```

## Views

The main `AppointmentsComponent` supports two switchable views, persisted in LocalStorage:

**Scroller view** (`appointments-scroller/`): A calendar-style single-day view. Shows time lanes from 8am–8pm. Appointments are rendered as positioned blocks using pixel calculations from `rendered-interval.ts`. Uses smart caching so adjacent dates load instantly. Tween animations handle smooth time-range transitions.

**List view** (`appointments-list/`): A chronological list with date dividers. Paginated via `PageableListDatasource` — loads 20 items per page, supports infinite scroll both forwards and backwards from the current date anchor. Maintains scroll position when loading more items.

## URL State

`?date=YYYY-MM-DD` — the currently viewed date  
`?filter=<SmartFilterJSON>` — active filter (serialized Smart Filter DSL)

Both are read/written reactively so the URL is always shareable and bookmarkable.

## Components

- **`AppointmentsComponent`**: Top-level container. Owns the date selector, view switcher, and filter dialog. The filter supports selecting client, service, and status (multi-select).

- **`AppointmentsScrollerComponent`**: Scroller view container. Uses `CalendarDayService` to fetch appointments + working hours for the visible date range.

- **`SingleDayAppointmentsComponent`**: Renders one day's appointments as a positioned grid inside the scroller.

- **`AppointmentsListComponent`**: List view container. Bidirectional pagination via `PageableListDatasource`; `keepScroll`/`restoreScroll` preserves the visible anchor when pages are prepended/appended. `updateDate()` writes the topmost visible day back to the URL as the user scrolls. The component is not route-reused — going to edit destroys it, going back rebuilds it from the URL date — so there's no detach/attach state to manage.

- **`SingleAppointmentListItemComponent`**: One row in the list view.

- **`AppointmentEditComponent`**: Create/edit form with:
  - Client lookup (`ClientLookupComponent` from `ClientsModule`)
  - Service lookup (`ServiceLookupComponent` from `ServicesModule`)
  - Duration picker
  - Date-time chooser (opens `DateTimeChooserComponent` as a modal)
  - Notes textarea
  - "Time not available" conflict handling — prompts the user to confirm overriding

- **`DateTimeChooserComponent`**: Modal combining a calendar date picker and a time-slot grid. Time slots are generated from `AppointmentService.getFreeTimes()` and rendered as `TimeButtonComponent` buttons.

- **`TimeButtonComponent`**: Individual available time slot button.

- **`SingleAppointmentComponent`**: Detail/view panel for one appointment showing date, time, duration, client, service, notes, previous appointment link, and status controls. Also shows the "notify client" action if `X-Can-Notify-Client: true` is returned in the response header.

## Services

**`AppointmentService`** (extends `BaseModelService`):
- `getAll(date?)` — all appointments for a date (scroller view)
- `getList()` — pageable list for the list view
- `getFreeTimes(date, serviceId, duration, ignoreAppointmentId?)` — available slots for the time picker
- `setStatus(appointment, status)` — change status with a toast confirmation
- `notifyClient(appointment, languageCode)` — send Instagram DM; reads `X-Can-Notify-Client` response header to determine availability

**`CalendarDayService`**: Fetches a full `CalendarDay` (appointments + working hours for a date) from `/calendarday/getAll`. Used by the scroller view for smart-cached day loading.

## Cross-Module Dependencies

This module imports `ClientsModule` (for `ClientLookupComponent`) and `ServicesModule` (for `ServiceLookupComponent`). The `SingleAppointmentComponent` is exported from this module and consumed by `DashboardModule` for the upcoming-unconfirmed list.
