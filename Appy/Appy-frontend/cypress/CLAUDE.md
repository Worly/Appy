# CLAUDE.md — E2E Tests (cypress/)

Cypress end-to-end tests that run against the full live stack. Triggered automatically on PRs to `main` via `.github/workflows/e2e_on_pr.yml`.

## CI Setup

The workflow:
1. Starts Postgres 14
2. Builds and starts the backend (`ASPNETCORE_ENVIRONMENT=Development`, `NO_FRONTEND=true`)
3. Starts `npx ng serve` for the frontend
4. Runs Cypress against `http://localhost:4200`

For local E2E: start the backend and frontend manually, then run `npx cypress open` (interactive) or `npx cypress run` (headless) from `Appy/Appy-frontend/`.

## Test Data

Tests call the backend's `/testing/seed` endpoint at the start of each suite to reset the database to a known state. The seeded state includes a test user, one facility, sample services, sample clients, and sample appointments. Do not rely on data left over from a previous test run.

## Custom Commands (cypress/support/)

| Command | Purpose |
|---------|---------|
| `cy.login()` | Authenticate as the seeded test user |
| `cy.getElement(name)` | Select an element by its `data-cy` attribute |
| `cy.expectURL(path)` | Assert the current URL path |

## Lookup Helpers (cypress/e2e/lookups/)

Reusable interaction abstractions for common UI widgets: client lookup, service lookup, duration picker, date picker. These keep test code focused on behavior rather than DOM structure.

## Test Coverage

`appointments.cy.ts` is the primary test file and covers appointment CRUD, both Scroller and List views, date/time picker interactions, status changes, and filter behavior.

## data-cy Convention

Test-selectable elements use `data-cy="<name>"` attributes. Add this attribute to any new interactive element that E2E tests need to target. Never use CSS classes or element IDs for test selection.
