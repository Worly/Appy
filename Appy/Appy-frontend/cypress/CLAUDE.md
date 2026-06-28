# CLAUDE.md — E2E Tests (cypress/)

Cypress end-to-end tests that run against the full live stack. Triggered automatically on PRs to `main` via `.github/workflows/e2e_on_pr.yml`.

## CI Setup

The workflow:
1. Starts Postgres 14
2. Builds and starts the backend (`ASPNETCORE_ENVIRONMENT=Development` — in Development the backend does not serve the frontend)
3. Starts `npx ng serve` for the frontend
4. Runs Cypress against `http://localhost:4200`

For local E2E: start the backend and frontend manually, then run `npx cypress open` (interactive) or `npx cypress run` (headless) from `Appy/Appy-frontend/`.

## Test Data

Tests call the backend's `/testing/seed` endpoint at the start of each suite to reset the database to a known state. The seeded state includes a test user, one facility, sample services, sample clients, and sample appointments. Do not rely on data left over from a previous test run.

## Custom Commands (cypress/support/)

| Command | Purpose |
|---------|---------|
| `cy.login()` | Authenticate as the seeded test user |
| `getElement(name)` | Select the single element with the matching `data-test` attribute (`getElements` for one-or-more) |
| `cy.expectURL(path)` | Assert the current URL path |

## Page Objects (cypress/e2e/pages/)

Each page's UI is wrapped in a page-object module (`appointments.ts`, `time-off.ts`) that exports plain objects whose methods drive the page (click buttons, read rows, open dialogs) and return chained sub-objects. **Specs never call Cypress (`cy.*` / `getElement`) on page elements directly — they go through these helpers**, so the DOM structure lives in one place. A spec may import another page's object to exercise cross-feature flows (e.g. `time-off.cy.ts` imports `appointments` to switch views / navigate dates when checking time-off badges and bands). Page objects live in modules (not `.cy.ts` files) so importing them doesn't re-register another spec's `describe`.

## Lookup Helpers (cypress/e2e/lookups/)

Reusable interaction abstractions for common UI widgets: client lookup, service lookup, duration picker, date picker, toggle switch. These keep test code focused on behavior rather than DOM structure.

## Component Helpers (cypress/e2e/)

`toast.ts` exports a generic `toast` helper for the global `app-toast` popup (`expectVisible`/`expectText`/`expectAction`/`expectNoAction`/`clickAction`). It is toast-agnostic: action buttons are addressed by their FontAwesome icon name, matching the `[data-test=toast-action-<icon>]` attribute the toast renders (e.g. the confirm button uses `"check"`).

## Test Coverage

`appointments.cy.ts` is the primary test file and covers appointment CRUD, both Scroller and List views, date/time picker interactions, status changes, and filter behavior. `time-off.cy.ts` covers time-off CRUD across the One-off / Recurring tabs and Upcoming / History scopes, the apply-from (fork) and stop-vs-delete dialogs, and how time-offs surface in the appointment list (all-day badge) and scroller (bands).

## Filtering Tests (@cypress/grep)

`@cypress/grep` lets you run a subset of tests by title (or tag) instead of the whole spec. It is registered in `support/e2e.ts` (`register()`) and wired into `cypress.config.ts` `setupNodeEvents` (`plugin()`).

```bash
npx cypress run --env grep="when date changes"             # only tests whose title contains this
npx cypress run --env grep="date changes; time changes"    # OR multiple titles
npx cypress run --env grep="-flaky"                          # exclude by title
npx cypress run --env grep="when date changes",grepFilterSpecs=true   # also skip non-matching spec files
```

Pinned to **5.x** on purpose: 6.x requires Cypress ≥ 15.10 (the new `Cypress.expose()` API), but this project runs Cypress 14. `cypress/cypress-grep.d.ts` is a type-only shim — the package is `exports`-only with no `main`, which the project's classic `node` moduleResolution (TS 4.9) can't resolve; Cypress's own bundler resolves it fine at runtime. Remove the shim if `moduleResolution` ever moves to `bundler`/`node16`.

## data-test Convention

Test-selectable elements use `data-test="<name>"` attributes, resolved via `getElement` / `getElements`. Add this attribute to any new interactive element that E2E tests need to target, and use it **only** for tests — never for styling. Never use CSS classes or element IDs for test selection.
