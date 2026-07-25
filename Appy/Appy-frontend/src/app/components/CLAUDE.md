# CLAUDE.md — Reusable UI Components (src/app/components/)

Presentational building blocks shared across feature pages. No domain logic, no HTTP — data in via `@Input`, out via `@Output`.

| Component | Purpose |
|-----------|---------|
| `ButtonComponent` | The app's one button — color and look variants, optional icon, loading state |
| `SegmentedControlComponent` | Single-select pill toggle / radio-style button group |
| `DialogComponent` | Modal overlay wrapper with an open/close API |
| `ContextMenuComponent` | Dropdown anchored to a trigger element, optionally rendered full-screen on mobile |
| `ActionBarComponent` | Flex container for page-level action buttons |
| `ActionDropdownComponent` | Dropdown variant of action-bar items |
| `ToastComponent` | Notification pop-up with an optional inline action button |
| `NotifyDialogComponent` | Yes/No confirmation dialog |
| `LoadingComponent` | Spinner indicator |
| `SearchComponent` | Text input with debounced output for list filtering |
| `ToggleSwitchComponent` | Boolean toggle input |
| `DropdownComponent` | Generic labeled option selector |
| `DurationPickerComponent` | Hour + minute duration input |
| `DateSelectorComponent` | Date navigation with previous/next/today |
| `CalendarDialogComponent` | Full calendar date picker in a dialog |
| `LanguagePickerComponent` | Language selector |
| `ColorSchemePickerComponent` | Light/dark/system theme selector |
| `AppointmentStatusIconsComponent` | Icon indicator for an appointment's status |
| `AppointmentStatusLookupComponent` | Dropdown for picking an appointment status |
| `TranslateComponent` | Renders a translation key as inline text, where `TranslatePipe` won't fit |

## App Shell (app.component)

`AppComponent` is the root component and navigation shell: a top bar on desktop, a fixed bottom bar on mobile. The facility selector, language picker, and color-scheme picker are embedded in it.

## Rules for New Components

- No business logic, no HTTP. Keep them generic.
- Style only via the CSS variables from `src/styles/` so both themes work.
- Add `data-test="<name>"` to interactive elements E2E tests may need (see `cypress/CLAUDE.md`).
