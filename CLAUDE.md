# CLAUDE.md

This file provides guidance to Claude Code (and other LLMs) when working with code in this repository.

## About Appy

Appointment management system for service businesses (salons, spas, beauty studios). Business owners manage facilities, services, clients, appointments, and working hours — with optional client notification via Instagram DMs.

**Stack**: ASP.NET Core 8 backend + Angular 16 frontend + PostgreSQL

## Project Structure

```
Appy/              # ASP.NET Core 6 backend (see Appy/CLAUDE.md)
Appy.Tests/        # xUnit unit tests — .NET 8.0 (see Appy.Tests/CLAUDE.md)
Appy/Appy-frontend/  # Angular 16 SPA (see Appy/Appy-frontend/CLAUDE.md)
.github/workflows/   # CI: E2E on PRs, Docker image on release
```

## Commands

### Backend (from repo root)
```bash
dotnet build                                          # Build
dotnet run --project Appy                             # Run (dev, https://localhost:5001)
dotnet test                                           # All unit tests
dotnet test --filter "FullyQualifiedName~ClassName"   # Single test class
dotnet ef migrations add <Name> --project Appy        # New migration
dotnet ef database update --project Appy              # Apply migrations
```

### Frontend (from Appy/Appy-frontend/)
```bash
npm install          # Install dependencies
npx ng serve         # Dev server → http://localhost:4200
npx ng build         # Production build
npx cypress open     # Interactive E2E runner
npx cypress run      # Headless E2E
```

## CLAUDE.md Map — Read Before Editing

**Every logical unit has its own CLAUDE.md. You MUST read it before editing any file in that unit.**

### A CLAUDE.md is a map, not a manual

Its only job is to let you tell **what lives in a folder and what each thing is for** — without guessing from filenames and without opening the files. Once the map points you at the right file, you open that file and read the implementation there. The map exists so you know *which* file to open; it never tries to save you from opening it.

**Write:** one line per unit (service, component, pipe, entity, page, utility) — its name and what it is responsible for. Plus the wiring you cannot see from inside a single file: who consumes what, which module exports what, cross-file ordering that matters.

**Never write:**
- Implementation details — algorithms, control flow, state flags, guard conditions, CSS/pixel math, caching mechanics, query construction.
- API surface transcriptions — method signatures, parameter lists, field-by-field DTO/model contents, enum members.
- Edge cases, validation rules, or the reasoning behind a behavior. Those live in the code, or in a comment next to the code.
- Anything answering *how it works*. The map answers *what it is* and *where it lives*.

**The test:** if a line would need changing when someone refactors the *inside* of a file, it does not belong here. If it repeats something the file itself already states, delete it.

### Size

A unit's CLAUDE.md should be readable in under 30 seconds: a one-or-two-sentence intro plus a table or bullet list. One sentence per entry — two only when a genuine cross-unit dependency needs explaining. Past ~60 short lines it has stopped being a map and needs cutting.

### When to update

Update a CLAUDE.md when a unit is **added, removed, renamed, or its responsibility changes** — that is what the map tracks. Changing how something works inside a file is not a map change: leave the CLAUDE.md alone.

| Unit | CLAUDE.md |
|------|-----------|
| Backend (ASP.NET Core) | `Appy/CLAUDE.md` |
| Unit Tests | `Appy.Tests/CLAUDE.md` |
| Frontend (Angular) | `Appy/Appy-frontend/CLAUDE.md` |
| Domain Entities (EF Core) | `Appy/Domain/CLAUDE.md` |
| API Controllers | `Appy/Controllers/CLAUDE.md` |
| Backend Services | `Appy/Services/CLAUDE.md` |
| Instagram Messaging | `Appy/Services/MessagingServices/CLAUDE.md` |
| Smart Filter DSL | `Appy/Services/SmartFilter/CLAUDE.md` |
| Facility Middleware & Attribute | `Appy/Services/Facilities/CLAUDE.md` |
| Data Transfer Objects | `Appy/DTOs/CLAUDE.md` |
| JWT Authentication | `Appy/Auth/CLAUDE.md` |
| Exception System | `Appy/Exceptions/CLAUDE.md` |
| Backend Utilities | `Appy/Utils/CLAUDE.md` |
| Request Middleware | `Appy/Middleware/CLAUDE.md` |
| Frontend Domain Models | `Appy/Appy-frontend/src/app/models/CLAUDE.md` |
| Global App Services | `Appy/Appy-frontend/src/app/services/CLAUDE.md` |
| Shared (Services, Pipes, Directives) | `Appy/Appy-frontend/src/app/shared/CLAUDE.md` |
| Reusable UI Components | `Appy/Appy-frontend/src/app/components/CLAUDE.md` |
| Feature Pages (index) | `Appy/Appy-frontend/src/app/pages/CLAUDE.md` |
| Page: Login | `Appy/Appy-frontend/src/app/pages/login/CLAUDE.md` |
| Page: Register | `Appy/Appy-frontend/src/app/pages/register/CLAUDE.md` |
| Page: Error | `Appy/Appy-frontend/src/app/pages/error/CLAUDE.md` |
| Page: Dashboard | `Appy/Appy-frontend/src/app/pages/dashboard/CLAUDE.md` |
| Page: Facilities | `Appy/Appy-frontend/src/app/pages/facilities/CLAUDE.md` |
| Page: Appointments | `Appy/Appy-frontend/src/app/pages/appointments/CLAUDE.md` |
| Page: Clients | `Appy/Appy-frontend/src/app/pages/clients/CLAUDE.md` |
| Page: Services | `Appy/Appy-frontend/src/app/pages/services/CLAUDE.md` |
| Page: Working Hours | `Appy/Appy-frontend/src/app/pages/working-hours/CLAUDE.md` |
| Page: Time Off | `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md` |
| Page: Client Notifications | `Appy/Appy-frontend/src/app/pages/client-notifications/CLAUDE.md` |
| Frontend Utilities | `Appy/Appy-frontend/src/app/utils/CLAUDE.md` |
| Theming & Global Styles | `Appy/Appy-frontend/src/styles/CLAUDE.md` |
| E2E Tests (Cypress) | `Appy/Appy-frontend/cypress/CLAUDE.md` |

## Key Architectural Decisions

**Multi-tenancy via Facilities**: All data is scoped to a `Facility` owned by a `User`. The active facility is communicated via a `facility-id` HTTP header on every API request. The backend validates ownership on every call via `SelectedFacilityAttribute`.

**Two-layer auth**: Short-lived JWT access tokens (1h) paired with long-lived stateful refresh tokens (7 days) stored in the database. Supports multiple devices via session families with reuse detection.

**Soft deletes for Services and Clients**: An `IsArchived` flag prevents the referential integrity problem of deleting records that `Appointment` rows still reference. Hard deletion is blocked at the service layer when references exist.

**Smart Filter DSL**: A JSON-array-based query language shared by the backend (compiled to LINQ expression trees) and the frontend (TypeScript types). Lets the frontend pass complex, typed filters to the API as a single URL query parameter.

**Reactive state without NgRx**: Frontend state flows through RxJS Observables, `Datasource` reactive containers, and a central `EntityChangeNotifyService` pub/sub hub. No store or reducers.

## CI/CD

- **PRs to `main`**: three required status checks must pass before merging —
  - `e2e` — E2E tests via `.github/workflows/e2e_on_pr.yml` (real Postgres, live backend + frontend + Cypress)
  - `backend-unit-tests` — backend xUnit tests via `.github/workflows/backend_unit_tests_on_pr.yml` (`dotnet test`, fully mocked — no Postgres/frontend)
  - `frontend-unit-tests` — frontend Karma/Jasmine tests via `.github/workflows/frontend_unit_tests_on_pr.yml` (`ng test` headless via the `ChromeHeadlessCI` launcher)
- **GitHub releases**: Docker image built for `linux/amd64` + `linux/arm64`, pushed to `worly/appy:latest`, then a Watchtower webhook triggers auto-deploy
