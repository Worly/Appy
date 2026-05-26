# CLAUDE.md — Reusable UI Components (src/app/components/)

Presentational building blocks shared across feature pages. No domain logic, no HTTP calls — data flows in via `@Input` and out via `@Output`.

## Component Inventory

| Component | Purpose |
|-----------|---------|
| `ButtonComponent` | Unified button with `color` (success/danger/warning/normal/disabled), `look` (solid/outlined/normal), loading spinner state, optional icon |
| `DialogComponent` | Modal overlay wrapper with open/close API |
| `ContextMenuComponent` | Dropdown menu positioned relative to a trigger element; used for navigation sub-menus |
| `ActionBarComponent` | Flex container for page-level action buttons (add, filter, etc.) with a built-in flex splitter |
| `ActionDropdownComponent` | Dropdown variant of action-bar items |
| `ToastComponent` | Notification pop-up with an optional inline action button |
| `NotifyDialogComponent` | Simple Yes/No confirmation dialog |
| `LoadingComponent` | Spinner indicator |
| `SearchComponent` | Text input with debounced output for list filtering |
| `ToggleSwitchComponent` | Boolean toggle input |
| `DropdownComponent` | Generic labeled option selector |
| `DurationPickerComponent` | Hour + minute duration input |
| `DateSelectorComponent` | Date navigation with previous/next/today buttons |
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
