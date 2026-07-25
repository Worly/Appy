# CLAUDE.md — Frontend (Appy-frontend/)

Angular 16 SPA. HTTP interceptors add `Authorization: Bearer <token>` and `facility-id: <id>` to every API call. The backend URL is set in `src/app/app.config.ts` (`/` in production, `https://localhost:5001/` in development).

## Commands (run from this directory)

```bash
npm install          # Install dependencies
npx ng serve         # Dev server → http://localhost:4200
npx ng build         # Production build into dist/
npx ng test          # Unit tests (Karma/Jasmine)
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

## Modules & Routing

`AppModule` is eager and holds login, register, dashboard, facilities, and all global providers. Everything else is a lazy feature module, preloaded in the background via `PreloadAllModules`. Routes and their guards are listed in `src/app/pages/CLAUDE.md`; unmatched paths redirect to `appConfig.homePage`.

## State

Three places, no store:
1. Server state through the **data seam** — `QueryResult` / `PagedResult` over a TanStack Query cache, with `CacheCoordinator` invalidation (see `src/app/shared/CLAUDE.md`).
2. URL query params for shareable view state (date, filter, tab).
3. LocalStorage for UI preferences (theme, language, view type).

## i18n & Dates

English (`en`) and Croatian (`hr`), with JSON files in `src/assets/translations/` resolved by `TranslatePipe`. Dates use **dayjs** throughout, including inside Angular Material pickers via `MaterialDayjsDateAdapter`. Both are bootstrapped in `AppInitializerService` before any component renders.
