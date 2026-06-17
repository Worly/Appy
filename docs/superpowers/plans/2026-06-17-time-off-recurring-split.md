# Time-Off Smart Recurring Bounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make recurring time-off bounds smart — open-ended creates become "today → forever", and editing a recurring rule forks its timeline at a user-chosen date instead of rewriting history.

**Architecture:** No DB schema change. A recurring `TimeOff` row already means "applies on `[StartDate, EndDate]`, null = open"; we treat a recurring rule as a timeline of segments (one row each). `AddNew` stamps today as the start for open-ended recurring rules. `Edit` gains an optional `applyFrom` date: when present (and the rule is recurring and the date is after the rule's start), the original row is clamped to the day before `applyFrom` and a new row carries the edits from `applyFrom` onward. The frontend prompts for that date in a dialog before saving.

**Tech Stack:** ASP.NET Core 8 (C#) backend, xUnit + Moq tests; Angular 16 (TypeScript) frontend; Cypress E2E; dayjs dates.

## Global Constraints

- Backend "today" is `DateOnly.FromDateTime(DateTime.Today)` (matches the rest of `TimeOffService`).
- Split boundary is **exclusive**: original segment ends `applyFrom.AddDays(-1)`; new segment starts on `applyFrom`. No day is double-covered.
- Split applies **only** to recurring rules (`Recurrence != OneOff`). One-off edits never fork and never show the dialog.
- The split collapses to a plain in-place edit when `applyFrom` is absent, or `<= existing.StartDate` (empty historical segment), or the rule is a one-off.
- Frontend test suite is pure-logic only — **there is no component/TestBed harness in this repo** (0 component specs). Frontend behavior is verified by `ng build`, the Cypress E2E in Task 5, and manual Playwright validation. Do NOT introduce a new component-test harness.
- i18n: every new translation key must be added to BOTH `en.translation.json` and `hr.translation.json`.
- Each unit's `CLAUDE.md` must be updated when behavior it describes changes (Task 6).

---

### Task 1: Backend — open-ended recurring create stamps today

**Files:**
- Modify: `Appy/Services/TimeOffService.cs` (`AddNew`, ~lines 49-57)
- Test: `Appy.Tests/Services/TimeOffServiceTests.cs`

**Interfaces:**
- Consumes: existing `ApplyDto`, `Validate`, `MainDbContext.TimeOffs`.
- Produces: `AddNew` unchanged signature `Task<TimeOff> AddNew(TimeOffDTO dto, int facilityId)`; post-condition — a recurring rule with `StartDate == null` gets `StartDate = today`.

- [ ] **Step 1: Write the failing tests**

Add to `Appy.Tests/Services/TimeOffServiceTests.cs` (after `AddNew_NullsIrrelevantFields`, before the `Seed` helper):

```csharp
[Fact]
public async Task AddNew_OpenEndedRecurring_StampsTodayAsStart()
{
    var dto = ValidOneOff();
    dto.Recurrence = TimeOffRecurrence.Weekly;
    dto.DayOfWeek = DayOfWeek.Monday;
    dto.StartDate = null;
    dto.EndDate = null;

    var result = await service.AddNew(dto, FacilityId);

    Assert.Equal(DateOnly.FromDateTime(DateTime.Today), result.StartDate);
    Assert.Null(result.EndDate); // still "forever"
}

[Fact]
public async Task AddNew_LimitedRecurring_PreservesBothBounds()
{
    var dto = ValidOneOff();
    dto.Recurrence = TimeOffRecurrence.Weekly;
    dto.DayOfWeek = DayOfWeek.Monday;
    dto.StartDate = new DateOnly(2030, 6, 1);
    dto.EndDate = new DateOnly(2030, 12, 31);

    var result = await service.AddNew(dto, FacilityId);

    Assert.Equal(new DateOnly(2030, 6, 1), result.StartDate);
    Assert.Equal(new DateOnly(2030, 12, 31), result.EndDate);
}

[Fact]
public async Task AddNew_OneOff_DoesNotStampStart()
{
    // One-offs always carry explicit dates; the today-stamp must not touch them.
    var dto = ValidOneOff(); // StartDate = 2030-06-01
    var result = await service.AddNew(dto, FacilityId);
    Assert.Equal(new DateOnly(2030, 6, 1), result.StartDate);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.AddNew_OpenEndedRecurring_StampsTodayAsStart"`
Expected: FAIL — `result.StartDate` is `null`, not today.

- [ ] **Step 3: Implement the today-stamp**

In `Appy/Services/TimeOffService.cs`, replace `AddNew`:

```csharp
public async Task<TimeOff> AddNew(TimeOffDTO dto, int facilityId)
{
    Validate(dto);
    var t = new TimeOff { FacilityId = facilityId };
    ApplyDto(t, dto);
    // A new recurring rule with no explicit start is "from today, forever" — stamp today so the
    // rule has a concrete effective-from (one-offs always carry their own dates).
    if (t.Recurrence != TimeOffRecurrence.OneOff && t.StartDate == null)
        t.StartDate = DateOnly.FromDateTime(DateTime.Today);
    context.TimeOffs.Add(t);
    await context.SaveChangesAsync();
    return t;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.AddNew"`
Expected: PASS (all `AddNew_*` tests).

- [ ] **Step 5: Commit**

```bash
git add Appy/Services/TimeOffService.cs Appy.Tests/Services/TimeOffServiceTests.cs
git commit -m "feat(timeoff): open-ended recurring create stamps today as start"
```

---

### Task 2: Backend — Edit forks the timeline via `applyFrom`

**Files:**
- Modify: `Appy/Services/TimeOffService.cs` (`ITimeOffService.Edit` signature ~line 13; `Edit` impl ~lines 59-68)
- Modify: `Appy/Controllers/TimeOffController.cs` (`Edit` action ~lines 45-51)
- Test: `Appy.Tests/Services/TimeOffServiceTests.cs`

**Interfaces:**
- Consumes: existing `Validate`, `ApplyDto`, `MainDbContext.TimeOffs`, `NotFoundException`.
- Produces:
  - `Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId, DateOnly? applyFrom = null)` on both interface and impl.
  - Split path returns the **new** segment (a distinct object from the original); in-place path returns the original entity.
  - Controller route: `PUT /timeoff/edit/{id}?applyFrom=YYYY-MM-DD` (param optional).

- [ ] **Step 1: Write the failing tests**

Add to `Appy.Tests/Services/TimeOffServiceTests.cs` (after the `AddNew_*` tests, before `AppliesOn_*`):

```csharp
[Fact]
public async Task Edit_RecurringWithApplyFrom_SplitsTimeline()
{
    var original = Seed(new TimeOff
    {
        Id = 7,
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Monday,
        StartDate = new DateOnly(2030, 6, 1),
        EndDate = null,
        Label = "Old",
        IsAllDay = true,
    });

    var dto = new TimeOffDTO
    {
        Label = "New",
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Tuesday, // the change applied from the split date onward
        IsAllDay = true,
    };

    var result = await service.Edit(7, dto, FacilityId, applyFrom: new DateOnly(2030, 6, 15));

    // New segment is returned: starts on the split date, carries the edits, stays open-ended.
    Assert.NotSame(original, result);
    Assert.Equal(new DateOnly(2030, 6, 15), result.StartDate);
    Assert.Null(result.EndDate);
    Assert.Equal("New", result.Label);
    Assert.Equal(DayOfWeek.Tuesday, result.DayOfWeek);
    Assert.Equal(FacilityId, result.FacilityId);

    // Original keeps its pre-edit values and ends the day before the split.
    Assert.Equal(new DateOnly(2030, 6, 14), original.EndDate);
    Assert.Equal("Old", original.Label);
    Assert.Equal(DayOfWeek.Monday, original.DayOfWeek);

    dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
}

[Fact]
public async Task Edit_RecurringApplyFromOnOrBeforeStart_EditsInPlace()
{
    var original = Seed(new TimeOff
    {
        Id = 8,
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Monday,
        StartDate = new DateOnly(2030, 6, 10),
        EndDate = null,
        Label = "Old",
        IsAllDay = true,
    });

    var dto = new TimeOffDTO { Label = "New", Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, IsAllDay = true };

    // applyFrom == start -> historical segment would be empty -> edit in place, no fork.
    var result = await service.Edit(8, dto, FacilityId, applyFrom: new DateOnly(2030, 6, 10));

    Assert.Same(original, result);
    Assert.Equal("New", result.Label);
    Assert.Null(result.EndDate);
}

[Fact]
public async Task Edit_OneOffWithApplyFrom_EditsInPlace()
{
    var original = Seed(new TimeOff
    {
        Id = 9,
        Recurrence = TimeOffRecurrence.OneOff,
        StartDate = new DateOnly(2030, 6, 1),
        EndDate = new DateOnly(2030, 6, 5),
        Label = "Old",
        IsAllDay = true,
    });

    var dto = ValidOneOff();
    dto.Label = "New";

    // One-offs ignore applyFrom entirely.
    var result = await service.Edit(9, dto, FacilityId, applyFrom: new DateOnly(2030, 6, 3));

    Assert.Same(original, result);
    Assert.Equal("New", result.Label);
    Assert.Equal(new DateOnly(2030, 6, 5), result.EndDate);
}

[Fact]
public async Task Edit_RecurringSplit_ThrowsWhenUntilBeforeApplyFrom()
{
    Seed(new TimeOff
    {
        Id = 10,
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Monday,
        StartDate = new DateOnly(2030, 6, 1),
        Label = "Old",
        IsAllDay = true,
    });

    var dto = new TimeOffDTO
    {
        Label = "New",
        Recurrence = TimeOffRecurrence.Weekly,
        DayOfWeek = DayOfWeek.Monday,
        EndDate = new DateOnly(2030, 6, 10), // until before the chosen split date
        IsAllDay = true,
    };

    await Assert.ThrowsAsync<ValidationException>(() =>
        service.Edit(10, dto, FacilityId, applyFrom: new DateOnly(2030, 6, 20)));
}
```

- [ ] **Step 2: Verify the file already imports what the tests need**

`TimeOffServiceTests.cs` already uses `Moq` (for `dbContextMock.Verify`) and `It` (`using Moq;`). `CancellationToken` lives in `System.Threading` — add `using System.Threading;` at the top of the test file if the build complains it's unresolved.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.Edit_"`
Expected: FAIL to compile — `Edit` has no `applyFrom` parameter.

- [ ] **Step 4: Update the interface signature**

In `Appy/Services/TimeOffService.cs`, in the `ITimeOffService` interface, replace:

```csharp
        Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId);
```

with:

```csharp
        Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId, DateOnly? applyFrom = null);
```

- [ ] **Step 5: Implement the split in `Edit`**

In `Appy/Services/TimeOffService.cs`, replace the whole `Edit` method:

```csharp
public async Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId, DateOnly? applyFrom = null)
{
    var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
    if (t == null)
        throw new NotFoundException();

    // A recurring rule is a timeline of segments. Editing with an applyFrom date that lands
    // strictly after the rule's current effective start forks the timeline: the original keeps
    // its old values and ends the day before applyFrom; a new segment carries the edits from
    // applyFrom onward. Otherwise (absent date, on/before the start, or a one-off) there's
    // nothing to preserve — edit in place.
    bool split = applyFrom.HasValue
        && t.Recurrence != TimeOffRecurrence.OneOff
        && (t.StartDate == null || applyFrom.Value > t.StartDate.Value);

    if (split)
        // The split date is the new segment's effective start; mirror it into the DTO so
        // Validate checks the real bounds (applyFrom <= until), not the form's From field.
        dto.StartDate = applyFrom!.Value;

    Validate(dto);

    if (split)
    {
        var newSegment = new TimeOff { FacilityId = facilityId };
        ApplyDto(newSegment, dto);                 // StartDate = applyFrom (set above), EndDate = until or null
        t.EndDate = applyFrom!.Value.AddDays(-1);  // original becomes the historical segment
        context.TimeOffs.Add(newSegment);
        await context.SaveChangesAsync();
        return newSegment;
    }

    ApplyDto(t, dto);
    await context.SaveChangesAsync();
    return t;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.Edit_"`
Expected: PASS (all four `Edit_*` tests).

- [ ] **Step 7: Wire the controller to accept `applyFrom`**

In `Appy/Controllers/TimeOffController.cs`, replace the `Edit` action:

```csharp
        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult<TimeOffDTO>> Edit(int id, TimeOffDTO dto, [FromQuery] DateOnly? applyFrom = null)
        {
            var result = await this.timeOffService.Edit(id, dto, HttpContext.SelectedFacility(), applyFrom);
            return Ok(result.GetDTO());
        }
```

- [ ] **Step 8: Build the whole backend to confirm no break**

Run: `dotnet build`
Expected: Build succeeded, 0 errors.

- [ ] **Step 9: Run the full backend test suite**

Run: `dotnet test`
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add Appy/Services/TimeOffService.cs Appy/Controllers/TimeOffController.cs Appy.Tests/Services/TimeOffServiceTests.cs
git commit -m "feat(timeoff): edit a recurring rule forks its timeline at applyFrom"
```

---

### Task 3: Frontend — service split-save method + edit dialog flow

**Files:**
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/services/time-off.service.ts`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.ts`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.html`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.scss`
- Modify: `Appy/Appy-frontend/src/assets/translations/en.translation.json`
- Modify: `Appy/Appy-frontend/src/assets/translations/hr.translation.json`

**Interfaces:**
- Consumes: backend `PUT /timeoff/edit/{id}?applyFrom=` (Task 2); `BaseModelService.save(entity, params?)`; `DialogComponent` (`open()`/`close()`/`isOpen`); `app-date-selector` (`[date]`/`(dateChange)`).
- Produces: `TimeOffService.saveWithSplit(timeOff, applyFrom?: Dayjs): Observable<TimeOff>`.

- [ ] **Step 1: Add `saveWithSplit` to the service**

In `time-off.service.ts`, add this method inside the class (after `getList`):

```typescript
  /**
   * Save an edit, optionally forking a recurring rule's timeline. When `applyFrom` is given the
   * backend keeps the original row as history (ending the day before) and writes a new segment
   * from `applyFrom` onward; without it, this is a plain in-place edit.
   */
  public saveWithSplit(timeOff: TimeOff, applyFrom?: Dayjs): Observable<TimeOff> {
    return this.save(timeOff, applyFrom ? { applyFrom: applyFrom.format("YYYY-MM-DD") } : undefined);
  }
```

`Dayjs` and `Observable` are already imported at the top of the file.

- [ ] **Step 2: Update the edit component class**

In `time-off-edit.component.ts`:

(a) Add `ViewChild` to the `@angular/core` import:

```typescript
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
```

(b) Add the dialog import (after the existing imports):

```typescript
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
```

(c) Add the dialog ViewChild and split state (after `public limitDateRange: boolean = false;`):

```typescript
  @ViewChild("splitDialog") splitDialog?: DialogComponent;

  // Split prompt state for recurring edits: "date" forks the timeline at `splitDate`,
  // "all" applies the change to the whole rule (no fork). Default date is today.
  public splitMode: "date" | "all" = "date";
  public splitDate: Dayjs = dayjs();
```

(d) In `ngOnInit`, in the edit branch, replace the recurring init line:

```typescript
        } else {
          this.limitDateRange = t.startDate != null || t.endDate != null;
        }
```

with:

```typescript
        } else {
          // Recurring rules always carry an effective-from (today on create), so the "limit"
          // toggle reflects whether an end/"until" bound exists — not the start.
          this.limitDateRange = t.endDate != null;
        }
```

(e) Replace the existing `save()` method with the split-aware flow:

```typescript
  public save(): void {
    if (!this.timeOff.validate()) return;

    // Recurring edits fork the rule's timeline — ask the user from which date the change applies.
    if (!this.isNew && this.type === "recurring") {
      this.splitMode = "date";
      this.splitDate = dayjs();
      this.splitDialog?.open();
      return;
    }

    this.commit();
  }

  public confirmSplit(): void {
    if (this.splitMode === "date") {
      // The chosen date is the new segment's start; it overrides the form's From field.
      this.timeOff.startDate = this.splitDate;
      if (!this.timeOff.validate()) {
        this.splitDialog?.close(); // surface the form error (e.g. split date after the "until")
        return;
      }
      this.splitDialog?.close();
      this.commit(this.splitDate);
    } else {
      // "Entire schedule" → plain in-place edit, no fork.
      this.splitDialog?.close();
      this.commit();
    }
  }

  public onSplitDateChange(date: Dayjs): void {
    this.splitDate = date;
  }

  private commit(applyFrom?: Dayjs): void {
    this.isLoading = true;
    const obs = this.isNew
      ? this.timeOffService.addNew(this.timeOff)
      : this.timeOffService.saveWithSplit(this.timeOff, applyFrom);

    this.subs.push(obs.subscribe({
      next: () => this.goBack(),
      error: () => { this.isLoading = false; }
    }));
  }
```

- [ ] **Step 3: Add the dialog to the template**

In `time-off-edit.component.html`, append after the final `</div>` (the `.page` closing tag, currently last line):

```html

<app-dialog #splitDialog>
  <div class="split-dialog" *ngIf="splitDialog.isOpen" data-test="time-off-split-dialog">
    <div class="split-title">{{ "pages.time-off.APPLY_FROM_TITLE" | translate }}</div>

    <div class="segmented">
      <button type="button" class="segment" [class.active]="splitMode === 'date'"
        (click)="splitMode = 'date'" data-test="time-off-split-from-date">
        {{ "pages.time-off.APPLY_FROM_SPECIFIC" | translate }}
      </button>
      <button type="button" class="segment" [class.active]="splitMode === 'all'"
        (click)="splitMode = 'all'" data-test="time-off-split-all">
        {{ "pages.time-off.APPLY_FROM_ALL" | translate }}
      </button>
    </div>

    <div class="field" *ngIf="splitMode === 'date'">
      <app-date-selector [date]="splitDate" (dateChange)="onSplitDateChange($event)"></app-date-selector>
    </div>

    <div class="split-actions">
      <app-button [text]="'CANCEL' | translate" color="danger" look="normal"
        (onClick)="splitDialog.close()"></app-button>
      <app-button [text]="'APPLY' | translate" color="success" look="solid"
        (onClick)="confirmSplit()" data-test="time-off-split-apply"></app-button>
    </div>
  </div>
</app-dialog>
```

- [ ] **Step 4: Add the dialog styles**

In `time-off-edit.component.scss`, append at the end:

```scss
// Recurring-edit "apply changes from" prompt (rendered inside app-dialog's centered overlay).
.split-dialog {
  background: rgb(var(--rgb-card-background));
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(92vw, 360px);
  box-sizing: border-box;
}

.split-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.split-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
```

- [ ] **Step 5: Add the English translation keys**

In `en.translation.json`, in the `"time-off"` block, replace this line:

```json
            "LIMIT_DATE_RANGE": "Limit to a date range",
```

with:

```json
            "LIMIT_DATE_RANGE": "Limit to a date range",
            "APPLY_FROM_TITLE": "Apply changes from",
            "APPLY_FROM_SPECIFIC": "A specific date",
            "APPLY_FROM_ALL": "The entire schedule",
```

- [ ] **Step 6: Add the Croatian translation keys**

In `hr.translation.json`, in the `"time-off"` block, replace this line:

```json
            "LIMIT_DATE_RANGE": "Ograniči na vremenski raspon",
```

with:

```json
            "LIMIT_DATE_RANGE": "Ograniči na vremenski raspon",
            "APPLY_FROM_TITLE": "Primijeni promjene od",
            "APPLY_FROM_SPECIFIC": "Određenog datuma",
            "APPLY_FROM_ALL": "Cijelog rasporeda",
```

- [ ] **Step 7: Build the frontend to confirm it compiles**

Run from `Appy/Appy-frontend/`: `npx ng build`
Expected: build succeeds, no template/type errors.

- [ ] **Step 8: Commit**

```bash
git add Appy/Appy-frontend/src/app/pages/time-off/services/time-off.service.ts \
        Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/ \
        Appy/Appy-frontend/src/assets/translations/en.translation.json \
        Appy/Appy-frontend/src/assets/translations/hr.translation.json
git commit -m "feat(timeoff): prompt for apply-from date when editing a recurring rule"
```

---

### Task 4: E2E — cover the apply-from dialog

**Files:**
- Modify: `Appy/Appy-frontend/cypress/e2e/time-off.cy.ts`

**Interfaces:**
- Consumes: data-test hooks added in Task 3 — `time-off-split-dialog`, `time-off-split-from-date`, `time-off-split-all`, `time-off-split-apply`; existing helpers `visitTimeOff`, `clickTab`, `clickRow`, `expectRow`, `selectDayOfWeek`, `toggleSwitch`, `getElement`, `expectURL`.

- [ ] **Step 1: Fix the existing recurring-edit test for the new dialog**

In `time-off.cy.ts`, in the test `"edits a weekly time off via the details modal and saves the new label"`, the two lines:

```typescript
    getElement("time-off-label").clear().type("Edited Weekly Label");
    cy.contains("Save").click();
    expectURL("/time-off");
```

become:

```typescript
    getElement("time-off-label").clear().type("Edited Weekly Label");
    cy.contains("Save").click();

    // Recurring edits now prompt for the apply-from scope; apply to the entire schedule.
    getElement("time-off-split-dialog").should("exist");
    getElement("time-off-split-all").click();
    getElement("time-off-split-apply").click();
    expectURL("/time-off");
```

- [ ] **Step 2: Add a test that one-off edits skip the dialog**

Add this test inside the `describe("Time Off", ...)` block (after the "deletes a one-off" test):

```typescript
  it("edits a one-off time off without showing the apply-from dialog", () => {
    visitTimeOff();
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("One Off No Prompt");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("oneoff");
    clickRow("One Off No Prompt");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    getElement("time-off-label").clear().type("One Off Saved Directly");
    cy.contains("Save").click();

    // One-offs save straight away — no fork dialog, navigation happens immediately.
    expectURL("/time-off");
    getElement("time-off-split-dialog").should("not.exist");

    clickTab("oneoff");
    expectRow("One Off Saved Directly");
  });
```

- [ ] **Step 3: Add a test that recurring edits show the dialog**

Add this test inside the `describe("Time Off", ...)` block:

```typescript
  it("prompts for the apply-from scope when editing a recurring time off", () => {
    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Prompt Alpha");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Prompt Alpha");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    getElement("time-off-label").clear().type("Prompt Beta");
    cy.contains("Save").click();

    // The apply-from dialog appears for recurring edits, with both choices.
    getElement("time-off-split-dialog").should("exist");
    getElement("time-off-split-from-date").should("exist");
    getElement("time-off-split-all").should("exist");

    // Default "specific date" is today; on a rule created today this collapses to an in-place edit.
    getElement("time-off-split-apply").click();
    expectURL("/time-off");

    clickTab("recurring");
    cy.get("[data-test=time-off-list]").should("not.contain", "Prompt Alpha");
    expectRow("Prompt Beta");
  });
```

- [ ] **Step 4: Run the time-off E2E suite (backend + frontend must be running)**

Run from `Appy/Appy-frontend/` with `run_in_background: true`:
`npx cypress run --spec cypress/e2e/time-off.cy.ts`
Expected: all Time Off specs PASS.

- [ ] **Step 5: Commit**

```bash
git add Appy/Appy-frontend/cypress/e2e/time-off.cy.ts
git commit -m "test(timeoff): e2e for the recurring-edit apply-from dialog"
```

---

### Task 5: Manual validation (Playwright MCP)

**Files:** none (verification only).

The real two-segment split (one row to Past, one to Active) can't be produced from freshly-seeded data because every new rule starts today; verify it manually where the date picker and a past-dated rule are in play.

- [ ] **Step 1: Verify open-ended create → today**

With backend + frontend running, create a recurring weekly rule with "Limit to a date range" OFF. Open it from the list, confirm via the network tab / re-edit that it persisted `startDate = today` and no end date.

- [ ] **Step 2: Verify the split produces two segments**

Edit that rule (change the day-of-week), Save, and in the dialog pick a **future** date (e.g. tomorrow), then Apply. Confirm:
- Recurring/Upcoming shows the new (edited) segment.
- The original segment still exists with its old day-of-week and an end date of the day before the chosen date.

- [ ] **Step 3: Verify "entire schedule"**

Edit the same rule's label, Save, choose "The entire schedule", Apply. Confirm a single row updates in place (no new segment).

- [ ] **Step 4: Verify the split-date-after-until guard**

Edit a recurring rule, enable "Limit to a date range" with an until-date in the near future, Save, then pick a split date **after** that until-date and Apply. Confirm the "Start date must be on or before end date" error shows and nothing is saved.

---

### Task 6: Documentation

**Files:**
- Modify: `Appy/Services/CLAUDE.md`
- Modify: `Appy/Controllers/CLAUDE.md`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md`

- [ ] **Step 1: Update the backend services map**

In `Appy/Services/CLAUDE.md`, in the `TimeOffService` table row, append to its description:

> ` ...; AddNew stamps today as StartDate for open-ended recurring rules; Edit(id, dto, facilityId, applyFrom?) forks a recurring rule's timeline at applyFrom (original clamped to applyFrom-1, new segment inserted from applyFrom onward).`

- [ ] **Step 2: Update the controller notes**

In `Appy/Controllers/CLAUDE.md`, under "Time Off-Specific Notes", add a bullet:

> - `PUT /timeoff/edit/{id}?applyFrom=YYYY-MM-DD` — for recurring rules, `applyFrom` forks the rule: the original row becomes history (ends the day before) and a new row carries the edit from that date onward. Absent (or for one-offs / a date on-or-before the rule's start) → plain in-place edit.

- [ ] **Step 3: Update the time-off page CLAUDE.md**

In `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md`:

In the **Editor** section, append:

> Saving a recurring edit opens an "apply changes from" dialog (a date — default today — that forks the rule's timeline via `TimeOffService.saveWithSplit` → `PUT edit?applyFrom=`; or "the entire schedule" for a plain in-place edit). One-off edits save directly. New open-ended recurring rules are persisted as today→forever (backend-stamped start).

In the **Service** section, append to the `TimeOffService` sentence:

> ` Also adds saveWithSplit(timeOff, applyFrom?) which appends the applyFrom query param for recurring timeline forks.`

- [ ] **Step 4: Commit**

```bash
git add Appy/Services/CLAUDE.md Appy/Controllers/CLAUDE.md Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md
git commit -m "docs(timeoff): document recurring timeline fork + today-stamped create"
```

---

## Self-Review

**Spec coverage:**
- Req 1 (open-ended create → today→forever): Task 1. ✓
- Req 2 (edit recurring → split at chosen date, default today; old = [start, X-1], new = [X, until|forever]): Task 2 (backend) + Task 3 (frontend dialog). ✓
- "Offer both" (split vs entire schedule): Task 3 `confirmSplit` two modes + Task 4 E2E. ✓
- "Keep start field, dialog overrides": Task 3 — form keeps Limit toggle/From/To; `confirmSplit` sets `timeOff.startDate = splitDate`, backend mirrors `dto.StartDate = applyFrom`. ✓
- Edge cases (collapse on `applyFrom <= start`; one-off ignores; until < applyFrom validation): Task 2 tests + Task 5 manual. ✓
- API shape (`?applyFrom=`): Task 2 controller. ✓
- Row identity (original = history, insert = new): Task 2 impl + test asserts `NotSame`/`Same`. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code and exact commands. ✓

**Type consistency:** `Edit(int, TimeOffDTO, int, DateOnly?)` consistent across interface, impl, controller, and the test calls. `saveWithSplit(timeOff, applyFrom?: Dayjs): Observable<TimeOff>` consistent between Task 3 definition and Task 3/4 usage. data-test names (`time-off-split-dialog`, `-from-date`, `-all`, `-apply`) consistent between Task 3 template and Task 4 tests. ✓

**Deviation from spec's "frontend unit test" item:** the repo has no component-test harness (0 component specs), so frontend behavior is covered by E2E (Task 4) + manual Playwright (Task 5) instead of a new TestBed spec — called out in Global Constraints.
