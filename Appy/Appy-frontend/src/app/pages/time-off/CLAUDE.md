# CLAUDE.md — Time Off Page (pages/time-off/)

Manages a facility's blocked availability — one-off rules, recurring rules, and imported public holidays. Requires `LoggedInGuard` + `SelectedFacilityGuard`. Lazy-loaded.

## Routes

- `/time-off` → `TimeOffComponent` — tabbed list. The active tab and scope persist in the URL (`?tab=oneoff|recurring|holidays&scope=upcoming|history`).
- `/time-off/new?type=oneoff|recurring` and `/time-off/edit/:id` → `TimeOffEditComponent`. Holidays edit through this same route.

## The Holiday Model

A materialized public holiday **is** a one-off `TimeOff`, so it is created, edited, and deleted through `TimeOffService` like any other. The backend embeds the immutable original `Holiday` snapshot in the `TimeOff`, so the frontend derives edited/removed state by comparing the two without a second fetch.

## Components

| Component | Purpose |
|-----------|---------|
| `TimeOffComponent` | Container — hosts the three tabs, the Upcoming/History scope switch, and each tab's primary action |
| `TimeOffListComponent` | Paginated one-off / recurring rule list |
| `SingleTimeOffListItemComponent` | One presentational list row, fed a flat row view so it never knows whether its source was a rule or a holiday |
| `SingleTimeOffComponent` | Details dialog for one active rule, including holiday provenance and the revert/remove actions |
| `RemovedHolidayComponent` | Details view for a removed holiday, which has no `TimeOff` left to load — offers Restore |
| `TimeOffDetailsCardComponent` | The presentational card both details views render into |
| `AllDayTimeOffPickerComponent` | Pick-list for choosing among a day's several all-day time-offs |
| `HolidayListComponent` | Paginated holiday list for the Holidays tab |
| `HolidayConfigureDialogComponent` | Country picker for the auto-import settings |
| `TimeOffEditComponent` | The single editor for every rule type. Recurrence is fixed on entry — there is no one-off ↔ recurring conversion. Enters a restricted holiday mode when the loaded rule carries a holiday |

`time-off-display.ts` holds the pure formatting and row-view builders shared by the lists and details views.

## Services

| Service | Purpose |
|---------|---------|
| `TimeOffService` | Extends `BaseModelService`; adds the paged list, the apply-from fork of a recurring rule's timeline, and stopping a recurring rule without deleting its history |
| `HolidayService` | Import settings, the holiday list, the original-snapshot lookup, and revert/restore. Does not extend `BaseModelService` — its endpoints don't fit the CRUD shape — but uses the same data seam |

Both invalidate the time-off, holiday, and appointment caches on mutation, so every affected view refetches on its own.

## Exported to Other Modules

`SingleTimeOffComponent` and `AllDayTimeOffPickerComponent` are exported and used by `AppointmentsModule`, where time-off occurrences render inside both appointment views.

## Elsewhere in the App

Occurrence expansion is backend-owned: the scroller and the appointment list each receive the relevant occurrences bundled into their own responses, and booking blocks any slot overlapping a time-off.
