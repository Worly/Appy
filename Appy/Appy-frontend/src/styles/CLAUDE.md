# CLAUDE.md — Theming & Global Styles (src/styles/)

The visual foundation. All colors flow from CSS custom properties set here. Components never hard-code color values.

## How Theming Works

CSS custom properties are declared on `body.light-theme` and `body.dark-theme`. `ColorSchemeService` (see `src/app/services/CLAUDE.md`) toggles these classes on `document.body`. Every component uses these variables, so the theme switches without reloading.

## Files

| File | Purpose |
|------|---------|
| `light-theme.scss` | All `--rgb-*` values for light mode |
| `dark-theme.scss` | All `--rgb-*` values for dark mode |
| `custom-theme.scss` | Angular Material palette definitions (applied via `mat.define-*-theme`) |
| `my-styles.scss` | Global utility classes and layout resets |

## Variable Convention

Variables store raw RGB channels: `--rgb-primary: 79, 117, 155`. Components use them as `rgba(var(--rgb-primary), 0.5)` to get transparency for free. Never add a variable to only one theme — both `light-theme.scss` and `dark-theme.scss` must declare every variable.

## Global Utility Classes

| Class | Purpose |
|-------|---------|
| `.w-card` | Card surface with background color, padding, and border-radius |
| `.w-input` | Styled input field |
| `.w-label` | Form label |
| `.w-title`, `.w-subtitle` | Typography hierarchy |
| `.w-overlay`, `.w-overlay-dark` | Hover effect overlay layer |
| `.w-clickable` | Pointer cursor + active press feedback |
| `.no-select` | Disables text selection |
| `.display-none` | `display: none` |

## Design Approach

**Mobile is the primary target.** The app is designed and used on mobile; desktop is secondary and not actively used. When building or adjusting layouts, optimize for mobile screens first. Desktop appearance is a nice-to-have, not a requirement.

## Navigation Bar Layout

- **Desktop** (>991px): fixed top bar, height controlled by `--navigation-bar-height: 64px`
- **Mobile** (≤991px): fixed bottom bar with an overlay shadow above it
- **Very short screens** (height ≤500px): navigation hidden off-screen to maximize content area
