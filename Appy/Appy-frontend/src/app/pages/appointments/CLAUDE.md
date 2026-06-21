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

**Scroller view** (`appointments-scroller/`): A calendar-style single-day view. Shows time lanes from 8am–8pm. Appointments are rendered as positioned blocks using pixel calculations from `rendered-interval.ts`. Time-off occurrences render as a hatched band; clicking a band opens the time-off details dialog (`app-single-time-off`) — a partial band opens its own occurrence, while the all-day band (which collapses every all-day off for the day into one "+N" band) opens that off directly when there's one or a pick-list when there are several, mirroring the list view. Uses smart caching so adjacent dates load instantly. Tween animations handle smooth time-range transitions. The sticky day header shows a contextual relative-date label inline (e.g. "· Today", "· in 3 days") via the shared `relativeDate`/`dateRelation` pipes.

**List view** (`appointments-list/`): A chronological list with date dividers. Paginated via a `PagedResult` (from `pagedQuery`) — loads 20 items per page, supports infinite scroll both forwards and backwards from the current date anchor. Time-off occurrences for the page's appointment dates arrive in the **same paged response** as the appointments (via the `extras$` sidecar of the `PagedResult`); `AppointmentsListComponent` combines them with `combineLatest(items$, extras$)` and renders both in one tick — there is **no separate time-off fetch**. Maintains scroll position when loading more items. Each date divider and the sticky current-date header show a relative-date label (Today / Tomorrow / in N days / N days ago), coloured by past/today/future via the shared `relativeDate`/`dateRelation` pipes; dividers also show any all-day time-off labels as badges. Partial time-off occurrences render as inline rows. Between two adjacent items (appointment or time-off) **on the same day**, the list shows the idle time as a faint dashed divider with the duration centred on it; when they overlap, the divider becomes a red jagged rule with a warning icon and both cards get a red inset outline. This comes from a `"gap"` rendered-item type built via the pure `buildDayTimeline()` helper (`utils/list-timeline.ts`); only consecutive same-day pairs are compared. Clicking an inline partial time-off row opens the time-off details dialog (`app-single-time-off`, imported from `TimeOffModule`); clicking an all-day divider badge opens that time-off's details dialog directly when the day has only one, or — when the day has several all-day time-offs — a pick-list to choose which.

## URL State

`?date=YYYY-MM-DD` — the currently viewed date  
`?filter=<SmartFilterJSON>` — active filter (serialized Smart Filter DSL)

Both are read/written reactively so the URL is always shareable and bookmarkable.

## Components

- **`AppointmentsComponent`**: Top-level container. Owns the date selector, view switcher, and filter dialog. The filter supports selecting client, service, and status (multi-select).

- **`AppointmentsScrollerComponent`**: Scroller view container. Uses `CalendarDayService` to fetch appointments + working hours for the visible date range.

- **`SingleDayAppointmentsComponent`**: Renders one day's appointments as a positioned grid inside the scroller.

- **`AppointmentsListComponent`**: List view container. Bidirectional pagination via a `PagedResult` (`items$` / `loadMore` / `hasMore`, with `loadingForwards$`/`loadingBackwards$` driving the bottom/top spinners). `keepScroll`/`restoreScroll` preserves the visible anchor when pages are prepended/appended. The component is not route-reused — going to edit destroys it, going back rebuilds it from the URL date — so there's no detach/attach state to manage. Two flags guard the post-load scroll position: (1) `userScrolling`, set by `window:wheel`/`touchmove`/middle-mousedown and cleared by programmatic scrolls, gates `updateDate()` so a programmatic-scroll echo never rewrites the URL with a stale date and triggers a reload. (2) `needsScrollToStartDate`, set by `load()` and cleared on the same user-input events, makes every render re-snap to `startDate` until the user scrolls — needed because both auto-paginate-back (which fires when the first snap lands near the top) and Angular's `scrollPositionRestoration` scrolling to `(0, 0)` on forward navigation can drag the viewport off the URL's date after the initial snap. Because re-snapping is tied to renders, a warm-cache revisit (instant cached paint, then a possibly-slow background refetch as the next render) would leave the viewport stuck at `(0, 0)` for the whole refetch if `scrollPositionRestoration` lands after the cached paint's snap; so the component also re-snaps on the router's `Scroll` event (deferred, so it runs after the router's own restoration) to bridge that render gap.

- **`SingleAppointmentListItemComponent`**: One row in the list view, showing the from–to time, the appointment duration (faint, just after the time — issue #128), service, and client. Takes an `isOverlapping` input that draws a red inset outline when the appointment collides with an adjacent one.

- **`AppointmentEditComponent`**: Create/edit form with:
  - Client lookup (`ClientLookupComponent` from `ClientsModule`)
  - Service lookup (`ServiceLookupComponent` from `ServicesModule`)
  - Duration picker
  - Date-time chooser (opens `DateTimeChooserComponent` as a modal)
  - Notes textarea
  - "Time not available" conflict handling — prompts the user to confirm overriding

- **`DateTimeChooserComponent`**: Modal combining a calendar date picker and a time-slot grid. Time slots are generated from `AppointmentService.getFreeTimes()` and rendered as `TimeButtonComponent` buttons.

- **`TimeButtonComponent`**: Individual available time slot button.

- **`SingleAppointmentComponent`**: Detail/view panel for one appointment, laid out as grouped cards — a header (service name + service-colour accent bar + status control), a "when" card (date, from–to time, duration), a client card, notes, and a previous-appointment link — with the created/updated timestamps demoted to a faint footer. Also shows the "notify client" action if `X-Can-Notify-Client: true` is returned in the response header.

## Services

**`AppointmentService`** (extends `BaseModelService`):
- `getAll(date?)` — all appointments for a date (scroller view)
- `getList()` — pageable list for the list view; returns `PagedResult<AppointmentView, TimeOffOccurrence>` (appointments as `items$`, the page's time-off occurrences as `extras$`)
- `getFreeTimes(date, serviceId, duration, ignoreAppointmentId?)` — available slots for the time picker
- `setStatus(appointment, status)` — change status with a toast confirmation
- `notifyClient(appointment, languageCode)` — send Instagram DM; reads `X-Can-Notify-Client` response header to determine availability

**`CalendarDayService`**: Fetches a full `CalendarDay` (appointments + working hours for a date) from `/calendarday/getAll`. Used by the scroller view for smart-cached day loading.

## Cross-Module Dependencies

This module imports `ClientsModule` (for `ClientLookupComponent`), `ServicesModule` (for `ServiceLookupComponent`), and `TimeOffModule` (for `SingleTimeOffComponent` — the time-off details dialog — and `AllDayTimeOffPickerComponent` — the all-day pick-list — both opened from the list and scroller views). The `SingleAppointmentComponent` is exported from this module and consumed by `DashboardModule` for the upcoming-unconfirmed list.
