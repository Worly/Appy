# Time Off — "Stop" instead of delete for recurring rules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When deleting an active, already-started recurring time off, let the user *stop* it at yesterday (keeping past occurrences as history) instead of hard-deleting the row.

**Architecture:** A dedicated backend operation `StopRecurring` clamps the rule's `EndDate` to yesterday. The editor's `delete()` opens an edit-style dialog (segmented control `[End it | Delete entirely]` + hint) only when stopping is meaningful; otherwise it hard-deletes as it does today. The choice of "stop" is encoded in a pure, unit-tested predicate.

**Tech Stack:** ASP.NET Core 8 + xUnit/Moq (backend), Angular 16 + Karma/Jasmine (frontend unit), Cypress (E2E), dayjs for dates.

## Global Constraints

- Backend `DateOnly` for all dates; "yesterday" = `DateOnly.FromDateTime(DateTime.Today).AddDays(-1)`.
- Frontend dates are `dayjs.Dayjs`; date-only comparisons use `.isBefore(other, "date")`.
- Recurring scope only — one-off delete is unchanged (immediate, no dialog).
- Test-selectable elements use `data-test="<name>"` (the `getElement(name)` Cypress helper selects by `data-test`, despite the cypress CLAUDE.md saying `data-cy`).
- Every code change updates the relevant unit's CLAUDE.md if it changes what that file describes.
- Translations must be added to **both** `en.translation.json` and `hr.translation.json`.
- This plan lives under `docs/superpowers/` and must be stripped from the branch before any PR.

---

### Task 1: Backend — `StopRecurring` service method + endpoint

**Files:**
- Modify: `Appy/Services/TimeOffService.cs` (add to `ITimeOffService` + `TimeOffService`)
- Modify: `Appy/Controllers/TimeOffController.cs` (new `PUT stop/{id}` action)
- Test: `Appy.Tests/Services/TimeOffServiceTests.cs`
- Docs: `Appy/Services/CLAUDE.md`, `Appy/Controllers/CLAUDE.md`

**Interfaces:**
- Produces: `Task<TimeOff> ITimeOffService.StopRecurring(int id, int facilityId)` — loads the rule scoped to the facility (`NotFoundException` if missing), throws `ValidationException` for a one-off, clamps `EndDate` to yesterday when the rule has not already ended on/before yesterday, returns the (possibly unchanged) rule.
- Produces: `PUT /timeoff/stop/{id}` → returns `TimeOffDTO`.

- [ ] **Step 1: Write the failing tests**

Add these four tests to `Appy.Tests/Services/TimeOffServiceTests.cs` (after the `Edit_*` tests, before the `AppliesOn_*` section). They reuse the existing `Seed(...)` helper and `FacilityId` constant:

```csharp
// ---- StopRecurring ----

[Fact]
public async Task StopRecurring_OpenEnded_ClampsEndDateToYesterday()
{
    var today = DateOnly.FromDateTime(DateTime.Today);
    var rule = Seed(new TimeOff
    {
        Id = 20,
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Monday,
        StartDate = today.AddDays(-30),
        EndDate = null,
        Label = "Closed Mondays",
        IsAllDay = true,
    });

    var result = await service.StopRecurring(20, FacilityId);

    Assert.Same(rule, result);
    Assert.Equal(today.AddDays(-1), result.EndDate);
    dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
}

[Fact]
public async Task StopRecurring_AlreadyEndedBeforeYesterday_IsNoOp()
{
    var today = DateOnly.FromDateTime(DateTime.Today);
    var endedEnd = today.AddDays(-10);
    var rule = Seed(new TimeOff
    {
        Id = 21,
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Monday,
        StartDate = today.AddDays(-40),
        EndDate = endedEnd,
        Label = "Old",
        IsAllDay = true,
    });

    var result = await service.StopRecurring(21, FacilityId);

    // Stopping never extends an already-expired rule's end forward to yesterday.
    Assert.Equal(endedEnd, result.EndDate);
    dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
}

[Fact]
public async Task StopRecurring_OneOff_ThrowsValidation()
{
    Seed(new TimeOff
    {
        Id = 22,
        Recurrence = TimeOffRecurrence.OneOff,
        StartDate = new DateOnly(2030, 6, 1),
        EndDate = new DateOnly(2030, 6, 5),
        Label = "Vacation",
        IsAllDay = true,
    });

    await Assert.ThrowsAsync<ValidationException>(() => service.StopRecurring(22, FacilityId));
}

[Fact]
public async Task StopRecurring_Missing_Throws404()
{
    await Assert.ThrowsAsync<NotFoundException>(() => service.StopRecurring(999, FacilityId));
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.StopRecurring"`
Expected: FAIL — compile error, `'ITimeOffService' does not contain a definition for 'StopRecurring'`.

- [ ] **Step 3: Add the method to the interface and service**

In `Appy/Services/TimeOffService.cs`, add to the `ITimeOffService` interface (next to `Delete`):

```csharp
        Task<TimeOff> StopRecurring(int id, int facilityId);
```

And implement it in the `TimeOffService` class, immediately after the `Delete` method:

```csharp
        // "Stop" a recurring rule going forward: clamp its end to yesterday so past occurrences
        // remain as history but it no longer applies from today on. Mirrors the EndDate clamp the
        // edit-fork applies to the historical segment. No-op (and no save) if the rule already ends
        // on or before yesterday, so stopping never extends an expired rule's end forward.
        public async Task<TimeOff> StopRecurring(int id, int facilityId)
        {
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
            if (t.Recurrence == TimeOffRecurrence.OneOff)
                throw new ValidationException(nameof(TimeOffDTO.Recurrence), "pages.time-off.errors.CANNOT_STOP_ONE_OFF");

            var yesterday = DateOnly.FromDateTime(DateTime.Today).AddDays(-1);
            if (t.EndDate == null || t.EndDate.Value > yesterday)
            {
                t.EndDate = yesterday;
                await context.SaveChangesAsync();
            }
            return t;
        }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.StopRecurring"`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Add the controller endpoint**

In `Appy/Controllers/TimeOffController.cs`, add this action after the `Delete` action:

```csharp
        [HttpPut("stop/{id}")]
        [Authorize]
        public async Task<ActionResult<TimeOffDTO>> StopRecurring(int id)
        {
            var result = await this.timeOffService.StopRecurring(id, HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }
```

- [ ] **Step 6: Build to verify the controller compiles**

Run: `dotnet build`
Expected: Build succeeded (pre-existing CS8618/ASP0019 warnings are fine).

- [ ] **Step 7: Update backend docs**

In `Appy/Services/CLAUDE.md`, in the `TimeOffService` row, append after the `Edit(...)` clause:
`; StopRecurring(id, facilityId) clamps a recurring rule's EndDate to yesterday (keep-history "stop"), rejecting one-offs and never extending an already-expired rule`.

In `Appy/Controllers/CLAUDE.md`, under "Time Off-Specific Notes", add a bullet:
`- `PUT /timeoff/stop/{id}` — clamps a recurring rule's `EndDate` to yesterday (stop-going-forward, keeps past occurrences). Rejects one-offs; no-op if the rule already ended earlier.`

- [ ] **Step 8: Commit**

```bash
git add Appy/Services/TimeOffService.cs Appy/Controllers/TimeOffController.cs Appy.Tests/Services/TimeOffServiceTests.cs Appy/Services/CLAUDE.md Appy/Controllers/CLAUDE.md
git commit -m "feat(timeoff): backend StopRecurring clamps recurring end to yesterday"
```

---

### Task 2: Frontend — `canStopRecurring` pure predicate

**Files:**
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/time-off-display.ts`
- Test: `Appy/Appy-frontend/src/app/pages/time-off/time-off-display.spec.ts`

**Interfaces:**
- Consumes: `TimeOff`, `TimeOffRecurrence` (`src/app/models/time-off`), `dayjs.Dayjs`.
- Produces: `canStopRecurring(timeOff: TimeOff, today: Dayjs): boolean` — true only for a recurring rule that has already started (`startDate < today`) and is still active (`endDate == null || endDate >= today`). The editor uses it to decide whether to offer the "stop" choice.

- [ ] **Step 1: Write the failing tests**

Add to `time-off-display.spec.ts`. First extend the import on line 6 to include the new function:

```ts
import { canStopRecurring, timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "./time-off-display";
```

Then add this `describe` block after the existing `describe("time-off-display", ...)` block (or as `it`s inside it — either is fine; shown here as a sibling for clarity):

```ts
describe("canStopRecurring", () => {
  const today = dayjs("2026-06-22");

  function recurring(start?: string, end?: string): TimeOff {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.Weekly;
    t.dayOfWeek = DayOfWeek.Monday;
    t.startDate = start ? dayjs(start) : undefined;
    t.endDate = end ? dayjs(end) : undefined;
    return t;
  }

  it("is true for a started, open-ended recurring rule", () => {
    expect(canStopRecurring(recurring("2026-06-01"), today)).toBe(true);
  });

  it("is true for a started recurring rule still active (end today or later)", () => {
    expect(canStopRecurring(recurring("2026-06-01", "2026-06-22"), today)).toBe(true);
    expect(canStopRecurring(recurring("2026-06-01", "2026-12-31"), today)).toBe(true);
  });

  it("is false for a one-off", () => {
    const t = new TimeOff();
    t.recurrence = TimeOffRecurrence.OneOff;
    t.startDate = dayjs("2026-06-01");
    t.endDate = dayjs("2026-06-30");
    expect(canStopRecurring(t, today)).toBe(false);
  });

  it("is false when the rule starts today or in the future (nothing to keep)", () => {
    expect(canStopRecurring(recurring("2026-06-22"), today)).toBe(false); // starts today
    expect(canStopRecurring(recurring("2026-07-01"), today)).toBe(false); // future
  });

  it("is false when the rule already expired (ended before today)", () => {
    expect(canStopRecurring(recurring("2026-05-01", "2026-06-21"), today)).toBe(false);
  });

  it("is false when a recurring rule has no start date", () => {
    expect(canStopRecurring(recurring(undefined), today)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx ng test --watch=false --include="**/time-off-display.spec.ts"`
Expected: FAIL — `canStopRecurring is not a function` / TS compile error (not exported).

- [ ] **Step 3: Implement the predicate**

Append to `time-off-display.ts` (add `Dayjs` to the existing imports at the top):

```ts
import { Dayjs } from "dayjs";
```

```ts
/**
 * Whether a recurring rule can be "stopped" (clamped to yesterday, keeping past occurrences) rather
 * than hard-deleted. Only meaningful for a recurring rule that has already started and is still
 * active — for one-offs, future/today-starting, or already-expired rules, stopping at yesterday
 * yields zero occurrences (i.e. equivalent to a delete), so the editor just deletes those outright.
 */
export function canStopRecurring(t: TimeOff, today: Dayjs): boolean {
  if (t.recurrence === TimeOffRecurrence.OneOff) return false;
  if (t.startDate == null) return false;
  if (!t.startDate.isBefore(today, "date")) return false;        // must have already started
  if (t.endDate != null && t.endDate.isBefore(today, "date")) return false; // must still be active
  return true;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx ng test --watch=false --include="**/time-off-display.spec.ts"`
Expected: PASS — all `canStopRecurring` tests green plus the existing display tests.

- [ ] **Step 5: Commit**

```bash
git add Appy/Appy-frontend/src/app/pages/time-off/time-off-display.ts Appy/Appy-frontend/src/app/pages/time-off/time-off-display.spec.ts
git commit -m "feat(timeoff): canStopRecurring predicate for the stop-vs-delete choice"
```

---

### Task 3: Frontend — service method, i18n, editor dialog wiring

**Files:**
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/services/time-off.service.ts`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.ts`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.html`
- Modify: `Appy/Appy-frontend/src/assets/translations/en.translation.json`
- Modify: `Appy/Appy-frontend/src/assets/translations/hr.translation.json`
- Docs: `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md`

**Interfaces:**
- Consumes: `canStopRecurring` (Task 2); `TimeOffService.stop` (below); `DialogComponent` open/close/isOpen; `SegmentedOption`.
- Produces: `TimeOffService.stop(id: any): Observable<void>` — `PUT timeOff/stop/{id}`, invalidates the same mutation keys as `delete`.

- [ ] **Step 1: Add the service method**

In `time-off.service.ts`, add an `Observable` import if not present (it already imports `map, Observable`). Add this method to `TimeOffService` (after `saveWithSplit`):

```ts
  /**
   * Stop a recurring rule going forward (backend clamps its end to yesterday, keeping history).
   * Mirrors `delete`'s shape — fire-and-forget, invalidating the same keys so the rule drops from
   * the Active list into Past and the appointment views refresh.
   */
  public stop(id: any): Observable<void> {
    return this.httpClient.put<void>(`${appConfig.apiUrl}${this.controllerName}/stop/${id}`, null)
      .pipe(map(() => {
        this.cache.invalidate(...this.mutationKeys);
      }));
  }
```

- [ ] **Step 2: Wire the component TypeScript**

In `time-off-edit.component.ts`:

(a) Add the import near the other display-helper-free imports (top of file):

```ts
import { canStopRecurring } from '../../time-off-display';
```

(b) Add the `@ViewChild` for the delete dialog, next to the existing `splitDialog`:

```ts
  @ViewChild("deleteDialog") deleteDialog?: DialogComponent;
```

(c) Add dialog state + options near `splitMode`/`splitModeOptions`:

```ts
  // Delete prompt state for recurring rules: "stop" clamps the rule's end to yesterday (keeps
  // history), "remove" hard-deletes the row. Only shown when canStopRecurring(...) is true.
  public deleteMode: "stop" | "remove" = "stop";

  public readonly deleteModeOptions: SegmentedOption[] = [
    { value: "stop", label: "pages.time-off.DELETE_MODE_STOP", dataTest: "time-off-delete-stop" },
    { value: "remove", label: "pages.time-off.DELETE_MODE_REMOVE", dataTest: "time-off-delete-remove" },
  ];
```

(d) Replace the existing `delete()` method with the branching version plus the two private executors:

```ts
  public delete(): void {
    if (this.isNew) return;

    // For an active, already-started recurring rule, offer "stop" (keep history) vs full delete.
    if (canStopRecurring(this.timeOff, dayjs())) {
      this.deleteMode = "stop";
      this.deleteDialog?.open();
      return;
    }

    this.deleteNow();
  }

  public confirmDelete(): void {
    this.deleteDialog?.close();
    if (this.deleteMode === "stop") this.stop();
    else this.deleteNow();
  }

  private stop(): void {
    this.isLoading = true;
    this.subs.push(this.timeOffService.stop(this.timeOff.id).subscribe({
      next: () => this.goBack(),
      error: () => { this.isLoading = false; }
    }));
  }

  private deleteNow(): void {
    this.isLoading = true;
    this.subs.push(this.timeOffService.delete(this.timeOff.id).subscribe({
      next: () => this.goBack(),
      error: () => { this.isLoading = false; }
    }));
  }
```

- [ ] **Step 3: Add the dialog markup**

In `time-off-edit.component.html`, add this block immediately after the existing `<app-dialog #splitDialog>...</app-dialog>` (it reuses the `.split-dialog` / `.split-title` / `.split-hint` / `.split-actions` SCSS already defined for the apply-from dialog):

```html
<app-dialog #deleteDialog>
  <div class="split-dialog" *ngIf="deleteDialog.isOpen" data-test="time-off-delete-dialog">
    <div class="split-title">{{ "pages.time-off.DELETE_TITLE" | translate }}</div>

    <app-segmented-control [options]="deleteModeOptions" [value]="deleteMode"
      (valueChange)="deleteMode = $event"></app-segmented-control>

    <!-- Explains the effect of the selected delete mode before the user commits. -->
    <div class="split-hint" data-test="time-off-delete-hint">
      <fa-icon [icon]="['fas', 'circle-info']" aria-hidden="true"></fa-icon>
      <span>{{ (deleteMode === 'stop' ? 'pages.time-off.DELETE_MODE_STOP_HINT' : 'pages.time-off.DELETE_MODE_REMOVE_HINT') | translate }}</span>
    </div>

    <div class="split-actions">
      <app-button [text]="'CANCEL' | translate" color="danger" look="normal"
        (onClick)="deleteDialog.close()"></app-button>
      <app-button [text]="'CONFIRM' | translate" color="danger" look="solid" [disabled]="isLoading"
        (onClick)="confirmDelete()" data-test="time-off-delete-confirm"></app-button>
    </div>
  </div>
</app-dialog>
```

- [ ] **Step 4: Add the English translations**

In `en.translation.json`, after the `APPLY_FROM_ALL_HINT` line (258) inside `pages.time-off`, add:

```json
            "DELETE_TITLE": "Delete time off",
            "DELETE_MODE_STOP": "End it",
            "DELETE_MODE_REMOVE": "Delete entirely",
            "DELETE_MODE_STOP_HINT": "Past occurrences are kept; the rule won't apply from today onward.",
            "DELETE_MODE_REMOVE_HINT": "Removes the rule and all of its history.",
```

And add a matching error key inside the `pages.time-off.errors` object (after `INVALID_DAY_OF_MONTH`, adding a comma to that line):

```json
                "INVALID_DAY_OF_MONTH": "Day of month must be between 1 and 31",
                "CANNOT_STOP_ONE_OFF": "A one-off time off can't be stopped — delete it instead"
```

- [ ] **Step 5: Add the Croatian translations**

In `hr.translation.json`, after the `APPLY_FROM_ALL_HINT` line (258), add:

```json
            "DELETE_TITLE": "Brisanje slobodnog dana",
            "DELETE_MODE_STOP": "Zaustavi",
            "DELETE_MODE_REMOVE": "Obriši u potpunosti",
            "DELETE_MODE_STOP_HINT": "Prošla ponavljanja se zadržavaju; pravilo se više ne primjenjuje od danas nadalje.",
            "DELETE_MODE_REMOVE_HINT": "Uklanja pravilo i cijelu njegovu povijest.",
```

And in `pages.time-off.errors` (after `INVALID_DAY_OF_MONTH`, adding a comma):

```json
                "INVALID_DAY_OF_MONTH": "Dan u mjesecu mora biti između 1 i 31",
                "CANNOT_STOP_ONE_OFF": "Jednokratni slobodan dan se ne može zaustaviti — umjesto toga ga obrišite"
```

- [ ] **Step 6: Verify the frontend compiles**

Run: `npx ng build`
Expected: build succeeds (the existing sass duplicate-theme / CommonJS warnings are fine).

- [ ] **Step 7: Update the time-off page docs**

In `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md`, in the `## Editor` section, after the sentence about the apply-from dialog, add:

> Delete on an active, already-started recurring rule opens a parallel dialog (`canStopRecurring` in `time-off-display.ts` gates it) offering **End it** — stop the rule at yesterday via `TimeOffService.stop` → `PUT stop/{id}`, keeping past occurrences — vs **Delete entirely** (the existing hard delete). One-off, expired, future, and today-starting rules delete immediately with no dialog.

Also extend the `## Service` section's `saveWithSplit` sentence with: `Also adds stop(id) → PUT stop/{id} (clamp a recurring rule's end to yesterday), invalidating the same keys as delete.`

- [ ] **Step 8: Commit**

```bash
git add Appy/Appy-frontend/src/app/pages/time-off/services/time-off.service.ts Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.ts Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.html Appy/Appy-frontend/src/assets/translations/en.translation.json Appy/Appy-frontend/src/assets/translations/hr.translation.json Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md
git commit -m "feat(timeoff): offer stop-at-yesterday when deleting an active recurring rule"
```

---

### Task 4: E2E coverage + final verification

**Files:**
- Modify: `Appy/Appy-frontend/cypress/e2e/time-off.cy.ts`

**Interfaces:**
- Consumes: the dialog `data-test` hooks from Task 3 (`time-off-delete-dialog`, `time-off-delete-stop`, `time-off-delete-remove`, `time-off-delete-confirm`) and existing helpers (`visitTimeOff`, `clickTab`, `clickScope`, `clickRow`, `getElement`, `expectRow`, `selectDayOfWeek`, `toggleSwitch`, `clickDeleteButton`, `dateLookup`).

- [ ] **Step 1: Write the E2E tests**

Add these two tests inside the `describe("Time Off", ...)` block in `time-off.cy.ts`. The first proves "stop" keeps history (rule moves to Past); the second proves a one-off delete still has no dialog. The active-recurring rule must have started before today, so pull its start back a month via `dateLookup`:

```ts
  it("offers stop-vs-delete when deleting an active recurring rule and 'End it' keeps it in Past", () => {
    const lastMonth = dayjs().subtract(1, "month").day(1); // a Monday roughly a month ago

    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Stoppable Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    // Recurring rules default their start to today; pull it back so the rule has already started.
    dateLookup("time-off-start-date").select(lastMonth);
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Stoppable Weekly");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    // Delete now prompts for recurring rules that have already started.
    clickDeleteButton();
    getElement("time-off-delete-dialog").should("exist");
    getElement("time-off-delete-stop").should("exist");
    getElement("time-off-delete-remove").should("exist");

    // "End it" (stop) is the default mode; confirm.
    getElement("time-off-delete-confirm").click();
    expectURL("/time-off");

    // It's gone from Active (Upcoming) but present in Past — history kept.
    clickTab("recurring");
    clickScope("upcoming");
    cy.get("[data-test=time-off-list]").should("not.contain", "Stoppable Weekly");
    clickScope("past");
    expectRow("Stoppable Weekly");
  });

  it("deletes a recurring rule entirely via the 'Delete entirely' option", () => {
    const lastMonth = dayjs().subtract(1, "month").day(1);

    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Removable Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    dateLookup("time-off-start-date").select(lastMonth);
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Removable Weekly");
    getElement("time-off-edit-button").click();

    clickDeleteButton();
    getElement("time-off-delete-dialog").should("exist");
    getElement("time-off-delete-remove").click();
    getElement("time-off-delete-confirm").click();
    expectURL("/time-off");

    // Absent from both scopes — fully removed.
    clickTab("recurring");
    clickScope("upcoming");
    cy.get("[data-test=time-off-list]").should("not.contain", "Removable Weekly");
    clickScope("past");
    cy.get("[data-test=time-off-list]").should("not.contain", "Removable Weekly");
  });
```

- [ ] **Step 2: Run the full backend + frontend unit suites**

Run: `dotnet test`
Expected: all backend tests pass (including the 4 new `StopRecurring` tests).

Run (from `Appy/Appy-frontend/`): `npx ng test --watch=false`
Expected: all frontend unit tests pass (including the new `canStopRecurring` tests).

- [ ] **Step 3: Run the E2E suite**

Ensure backend + frontend are running (backend with `NO_FRONTEND=true` on `https://localhost:5001`, frontend on `http://localhost:4200`). From `Appy/Appy-frontend/`, run the time-off spec (use `run_in_background: true` — it takes a few minutes):

Run: `npx cypress run --spec "cypress/e2e/time-off.cy.ts"`
Expected: all time-off E2E tests pass, including the two new ones.

- [ ] **Step 4: Manual validation (mobile layout)**

With Playwright at 390×844, create an active recurring rule (start last month), open it in the editor, press Delete, and confirm: the dialog appears with `[End it | Delete entirely]`; "End it" moves the rule to Past; re-test "Delete entirely" removes it; a one-off's Delete still removes immediately with no dialog.

- [ ] **Step 5: Commit**

```bash
git add Appy/Appy-frontend/cypress/e2e/time-off.cy.ts
git commit -m "test(timeoff): e2e for stop-vs-delete on recurring time off"
```

---

## Self-Review

**Spec coverage:**
- "Stop ends at yesterday" → Task 1 `StopRecurring` (clamp to `today-1`) + tests. ✓
- "Recurring only; one-off unchanged" → Task 2 predicate returns false for one-off; Task 3 `delete()` branch; Task 4 one-off path implicit (existing test untouched). ✓
- "Only when meaningful (started + active)" → Task 2 predicate + tests for future/today/expired. ✓
- Backend reject one-off / 404 → Task 1 tests. ✓
- Dedicated endpoint + frontend service with cache invalidation → Task 1 endpoint, Task 3 `stop(id)`. ✓
- Edit-consistent dialog (segmented control + hint) → Task 3 markup reusing split-dialog SCSS. ✓
- i18n en + hr → Task 3 steps 4–5. ✓
- Backend + frontend tests, E2E, docs → Tasks 1, 2, 4 + doc steps. ✓

**Placeholder scan:** No TBD/TODO; every code/step shows real content. ✓

**Type consistency:** `StopRecurring(int, int)` used identically in service, interface, controller, and tests. `canStopRecurring(TimeOff, Dayjs)` identical in predicate, spec, and component call. `stop(id)` returns `Observable<void>` consistent in service and both component callers. `deleteMode` union `"stop" | "remove"` consistent across TS + HTML. Translation keys referenced in HTML (`DELETE_TITLE`, `DELETE_MODE_STOP`/`_HINT`, `DELETE_MODE_REMOVE`/`_HINT`) all added in Task 3. `data-test` hooks added in Task 3 match those asserted in Task 4. ✓
