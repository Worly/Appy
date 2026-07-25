# CLAUDE.md — Theming & Global Styles (src/styles/)

The visual foundation. All colors flow from CSS custom properties declared here — components never hard-code a color value.

| File | Purpose |
|------|---------|
| `light-theme.scss` | Every `--rgb-*` value for light mode |
| `dark-theme.scss` | Every `--rgb-*` value for dark mode |
| `custom-theme.scss` | Angular Material palette definitions |
| `my-styles.scss` | Global utility classes (`.w-card`, `.w-input`, `.w-label`, `.w-title`, `.w-overlay`, `.w-clickable`, …) and layout resets |

## Conventions

- Variables hold raw RGB channels (`--rgb-primary: 79, 117, 155`) so components can use `rgba(var(--rgb-primary), 0.5)` and get transparency for free.
- **Every variable must exist in both theme files.** `ColorSchemeService` swaps the theme by toggling a class on `document.body`, so a variable missing from one theme silently breaks it.
- **Mobile is the primary target.** The app is designed and used on mobile; desktop is secondary and not actively used. Optimize layouts for mobile first — desktop appearance is nice-to-have.
- The navigation bar is a top bar above 991px and a fixed bottom bar below it; on very short screens it hides entirely to reclaim content space.
