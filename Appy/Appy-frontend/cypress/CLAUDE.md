# CLAUDE.md — E2E Tests (cypress/)

Cypress tests running against the full live stack. Run automatically on PRs to `main` via `.github/workflows/e2e_on_pr.yml`, which starts Postgres, the backend, and `ng serve` before running the suite.

Locally: start the backend and frontend yourself, then `npx cypress open` or `npx cypress run` from `Appy/Appy-frontend/`.

## Layout

| Folder | Contents |
|--------|----------|
| `e2e/*.cy.ts` | The specs — `appointments.cy.ts` (appointment CRUD, both views, pickers, status, filters) and `time-off.cy.ts` (time-off CRUD across tabs and scopes, and how time-offs surface in the appointment views) |
| `e2e/pages/` | One page-object module per page, wrapping that page's DOM |
| `e2e/lookups/` | Reusable interaction helpers for common widgets (client, service, duration, date, toggle) |
| `e2e/toast.ts` | Helper for the global toast popup |
| `support/` | Custom commands — `cy.login()`, `getElement`/`getElements`, `cy.expectURL()` |

## Rules

- **Specs never touch the DOM directly.** No `cy.*` or `getElement` on page elements in a spec — go through a page object or lookup helper, so DOM structure lives in one place. Specs may import another page's object for cross-feature flows.
- Page objects live in plain modules, not `.cy.ts` files, so importing one doesn't re-register another spec's `describe`.
- **Select by `data-test="<name>"` only** — never CSS classes or element IDs. The attribute is for tests only, never for styling.
- Each suite reseeds the database via the backend's `/testing/seed`. Never rely on data from a previous run.

## Running a Subset

`@cypress/grep` is registered in `support/e2e.ts` and `cypress.config.ts`:

```bash
npx cypress run --env grep="when date changes"                      # by title
npx cypress run --env grep="a; b"                                   # OR several
npx cypress run --env grep="-flaky"                                 # exclude
npx cypress run --env grep="x",grepFilterSpecs=true                 # skip non-matching specs too
```

Pinned to 5.x — 6.x needs Cypress ≥ 15.10 and this project is on 14. `cypress/cypress-grep.d.ts` is a type-only shim for the project's classic `node` module resolution; drop it if that ever moves to `bundler`/`node16`.
