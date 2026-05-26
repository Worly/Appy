# CLAUDE.md — Frontend (Appy-frontend/)

Angular 16 SPA. All API calls include `Authorization: Bearer <token>` and `facility-id: <id>` headers added by HTTP interceptors. The backend URL is `/` in production and `https://localhost:5001/` in development (set in `src/app/app.config.ts`).

## Commands (run from this directory)

```bash
npm install          # Install dependencies
npx ng serve         # Dev server → http://localhost:4200
npx ng build         # Production build into dist/
npx cypress open     # Interactive E2E runner
npx cypress run      # Headless E2E (used in CI)
```

## Child CLAUDE.md Files

**Read the relevant CLAUDE.md before editing files in any of these folders:**

| Folder | CLAUDE.md |
|--------|-----------|
| `src/app/models/` | `src/app/models/CLAUDE.md` |
| `src/app/services/` | `src/app/services/CLAUDE.md` |
| `src/app/shared/` | `src/app/shared/CLAUDE.md` |
| `src/app/components/` | `src/app/components/CLAUDE.md` |
| `src/app/pages/` | `src/app/pages/CLAUDE.md` |
| `src/app/utils/` | `src/app/utils/CLAUDE.md` |
| `src/styles/` | `src/styles/CLAUDE.md` |
| `cypress/` | `cypress/CLAUDE.md` |

## Module Structure

- **AppModule** (eager): login, register, dashboard, facilities, and all global providers
- **Lazy modules**: appointments, clients, services, working-hours, client-notifications
- **PreloadAllModules**: lazy modules preload in the background after initial render

## Routing & Guards

```
/login, /register         → NotLoggedInGuard
/error                    → (no guard)
/facilities               → LoggedInGuard
/dashboard                → LoggedInGuard + SelectedFacilityGuard
/appointments             → LoggedInGuard + SelectedFacilityGuard (lazy)
/clients                  → LoggedInGuard + SelectedFacilityGuard (lazy)
/services                 → LoggedInGuard + SelectedFacilityGuard (lazy)
/working-hours            → LoggedInGuard + SelectedFacilityGuard (lazy)
/client-notifications     → LoggedInGuard + SelectedFacilityGuard (lazy)
**                        → redirects to /appointments (via appConfig.homePage)
```

`SelectedFacilityGuard` redirects to `/facilities` when no facility is selected.

## State Management

No NgRx. State flows via:
1. RxJS Observables from services
2. `EntityChangeNotifyService` (pub/sub) to sync CRUD changes across components
3. `Datasource` classes as reactive data containers
4. URL query params for shareable view state (date, filter)
5. LocalStorage for UI preferences (theme, language, view type)

## Internationalization

Two languages: English (`en`) and Croatian (`hr`). JSON files in `src/assets/translations/`. The `TranslatePipe` resolves keys. Language persisted in LocalStorage. Both locales configure Monday as the first day of the week.

## Date/Time

**dayjs** with `duration`, `customParseFormat`, `isBetween`, `isSameOrBefore`, `isSameOrAfter` plugins. `MaterialDayjsDateAdapter` makes Angular Material date pickers use dayjs objects. Initialized in `AppInitializerService` before any component renders.
