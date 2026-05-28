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

- **`AppointmentsListComponent`**: List view container. Uses `AppointmentService.getList()` with `PageableListDatasource`. Scroll-position management (`keepScroll`/`restoreScroll`) preserves the visible anchor when new pages are prepended/appended. `updateDate()` derives the currently-viewed date from the topmost visible element and emits it (driving the date selector + URL). Four design points keep this correct without timers: (1) **`updateDate()` is gated on `userScrolling`** — a flag set by genuine user-scroll input (`window:wheel`, `window:touchmove`, and a middle-button `window:mousedown` that starts autoscroll/panning) and reset right before every programmatic scroll. The date selector therefore tracks only genuine user scrolling and is never moved by a programmatic scroll (pagination's `restoreScroll()`, `scrollToStartDate()`, the router's scroll restoration, or the `scrollY=0` clamp when the list is cleared). Emitting a date from one of those would rewrite the URL with a stale early date and spin an endless reload loop drifting ever earlier — exactly the bug this guards against. (2) After a fresh `load()` **every** render scrolls the viewport to the `startDate` marker (gated on `needsScrollToStartDate`, which `load()` sets and the user-scroll listeners clear). Snapping back on every render — not just the first — prevents drift from the initial near-top auto-load of the previous page: that pagination's `keepScroll`/`restoreScroll` would otherwise preserve startDate's appointment at its post-scrollIntoView viewport offset (a few dozen pixels below top, because of the sticky current-date header and the loading spinner shift), leaving the previous date at the top of the viewport even though the URL points to startDate. (3) **`scrollToDate()` also re-snaps on `requestAnimationFrame`** — between the sync `scrollIntoView` and the next paint the viewport can drift to the day after, because Angular's `scrollPositionRestoration` schedules its own `setTimeout(0)`, a late cached-datasource emission can fire a stray `renderAppointments` whose `keepScroll`/`restoreScroll` lands on a later-day anchor, and the browser settles layout asynchronously. The rAF re-snap runs before the next paint so the user never sees the day after. (4) **`ngAfterAttach()` realigns `startDate` with `_date` before loading** — the user may have scrolled to a different day, which `updateDate()` writes into `_date` and the URL but never into `startDate`. If save's `router.navigate` then pushes a URL whose date equals the post-scroll `_date`, the date input setter early-returns on the `isSame(_date, value)` check and leaves `startDate` stuck at the original navigated-to date; `load()` would then fetch from `_date` but `scrollToDate` would snap to the stale `startDate`, landing the viewport on the wrong day even though the URL is correct. Once the user physically scrolls, `needsScrollToStartDate` clears and `keepScroll`/`restoreScroll` takes over for the user's chosen anchor. Note: scrollbar-drag and keyboard scrolling still don't emit any of the tracked input events, so they don't live-update the selector (acceptable trade vs. the reload loop).

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
