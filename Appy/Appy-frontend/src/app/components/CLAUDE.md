# CLAUDE.md — Reusable UI Components (src/app/components/)

Presentational building blocks shared across feature pages. No domain logic, no HTTP calls — data flows in via `@Input` and out via `@Output`.

## Component Inventory

| Component | Purpose |
|-----------|---------|
| `ButtonComponent` | Unified button with `color` (success/danger/warning/normal/primary/inherit), `look` (solid/outlined/normal/transparent/custom), loading spinner state, optional icon |
| `SegmentedControlComponent` | Single-select button group / radio-style pill toggle. `[(value)]` + `options` (`{value, label, icon?, dataTest?}` — `icon` is an optional FontAwesome solid icon shown before the label, registered in `app.module`); `size` `default` (full-width) or `compact`. Each segment is an `app-button` (transparent when inactive, solid-`primary` when active); segment corners are nested concentrically inside the pill and labels clip (no scrollbar) rather than overflow. Used for the time-off tabs, scope switch, and editor segments |
| `DialogComponent` | Modal overlay wrapper with open/close API |
| `ContextMenuComponent` | Dropdown menu positioned relative to a trigger element; used for navigation sub-menus. Opt-in `fullscreenOnMobile` input renders it as a centered full-screen modal (backdrop + blocked scroll) on mobile-width viewports (`< 992px`) instead of an anchored dropdown — avoids CDK reposition jank when the on-screen keyboard opens (issue #26). In full-screen mode it shows a sticky header bar with an optional `title` and a close (✕) button so it can be dismissed without picking a value. Enabled on the client and service lookups. |
| `ActionBarComponent` | Flex container for page-level action buttons (add, filter, etc.) with a built-in flex splitter |
| `ActionDropdownComponent` | Dropdown variant of action-bar items |
| `ToastComponent` | Notification pop-up with an optional inline action button |
| `NotifyDialogComponent` | Simple Yes/No confirmation dialog |
| `LoadingComponent` | Spinner indicator |
| `SearchComponent` | Text input with debounced output for list filtering |
| `ToggleSwitchComponent` | Boolean toggle input |
| `DropdownComponent` | Generic labeled option selector. `matchTriggerWidth` makes the options panel at least as wide as the trigger (forwards to the context menu's `copyOriginWidth`); `fullWidth` renders the trigger as a full-width, select-style control (fills its container; with a caret, label left + caret far right via the button's `space-between` alignment) |
| `DurationPickerComponent` | Hour + minute duration input |
| `DateSelectorComponent` | Date navigation with previous/next/today buttons. `showDayOfWeek` appends the localized weekday to the displayed date (e.g. "21.06.2026, Monday") |
| `CalendarDialogComponent` | Full calendar date picker (Angular Material datepicker inside a dialog) with a custom today-header component |
| `LanguagePickerComponent` | Language selector |
| `ColorSchemePickerComponent` | Light/dark/system theme selector |
| `AppointmentStatusIconsComponent` | Visual status indicator showing icon(s) for an appointment's status |
| `AppointmentStatusLookupComponent` | Dropdown for selecting an appointment status |
| `TranslateComponent` | Renders a translation key as inline text (alternative to `TranslatePipe` when a structural element is needed) |

## App Shell (app.component)

`AppComponent` is the root component and navigation shell. It renders:
- **Desktop**: horizontal nav bar at the top
- **Mobile** (≤991px): fixed bottom navigation bar

Navigation items with sub-menus use `ContextMenuComponent`. The facility selector, language picker, and color scheme picker are embedded directly in the nav bar.

## Rules for New Components

- No business logic, no HTTP. Keep components generic and reusable.
- Style exclusively via CSS variables from `src/styles/` so they work in both light and dark themes.
- Add `data-cy="<name>"` attributes to interactive elements that E2E tests may need (see `cypress/CLAUDE.md`).
