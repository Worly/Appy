# Time-off Recurring Save Dialog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the recurring time-off save dialog clearer (EN + HR) and stop it from firing — and silently overwriting the start date — when the user only moved the rule's start date.

**Architecture:** Pure frontend change. `TimeOffEditComponent` records the rule's start date on load; on save, a recurring edit only opens the timeline-fork dialog when the start date is unchanged, otherwise it saves in place. The dialog's `APPLY_FROM_*` translation strings are reworded. The backend fork (`TimeOffService.Edit` + `applyFrom`) and `confirmSplit` are untouched.

**Tech Stack:** Angular 16, TypeScript, dayjs, Jasmine/Karma. Translations are JSON under `src/assets/translations/`.

## Global Constraints

- Edit translations only in `Appy/Appy-frontend/src/assets/translations/{en,hr}.translation.json`. The `Appy-frontend/build/...` copies are build artifacts — never hand-edit.
- Two languages must stay in parity: every key changed in `en` is changed in `hr`.
- Reuse the existing `APPLY_FROM_*` keys — change values only, no key renames, so no template changes.
- dayjs date comparisons in this file use the unit string `"date"` (matches existing code at `time-off-edit.component.ts:209,240`).
- All frontend commands run from `Appy/Appy-frontend/`.

---

### Task 1: Gate the save dialog on the start date

**Files:**
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.ts`
- Test: `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.spec.ts`

**Interfaces:**
- Consumes: `TimeOffService.saveWithSplit(timeOff, applyFrom?)`, `TimeOffService.addNew(timeOff)`, `TimeOff.validate()` (returns `boolean`), `DialogComponent.open()/close()`.
- Produces: new private field `originalStartDate?: Dayjs`; behavior change in `save()` — for a recurring edit, opens `splitDialog` only when the start date equals `originalStartDate`, else falls through to `commit()` (which sends no `applyFrom`).

- [ ] **Step 1: Write the failing tests**

Append this `describe` block to `time-off-edit.component.spec.ts` (the file already imports `dayjs`, `TimeOff`/`TimeOffRecurrence`, `DayOfWeek`, `TimeOffEditComponent` and extends the needed dayjs plugins):

```ts
describe("TimeOffEditComponent — recurring save dialog gate", () => {
  // A fake observable that records subscription but never emits, so the success handler
  // (goBack) never runs — we only assert which service method was invoked.
  const fakeObs = () => ({ subscribe: () => ({ unsubscribe() {} }) });

  function makeWithService() {
    const service = {
      saveWithSplit: jasmine.createSpy("saveWithSplit").and.callFake(fakeObs),
      addNew: jasmine.createSpy("addNew").and.callFake(fakeObs),
    };
    const c = new TimeOffEditComponent(service as any, null as any, null as any, null as any);
    c.isNew = false;
    c.type = "recurring";
    c.timeOff.recurrence = TimeOffRecurrence.Weekly;
    c.timeOff.label = "Vacation";                       // satisfy validate()
    c.timeOff.dayOfWeek = DayOfWeek.Monday;
    c.timeOff.startDate = dayjs("2026-01-05");
    c.timeOff.timeFrom = dayjs("2026-01-05T09:00:00");
    c.timeOff.timeTo = dayjs("2026-01-05T17:00:00");
    (c as any).originalStartDate = dayjs("2026-01-05");  // baseline "as loaded"
    const splitDialog = { open: jasmine.createSpy("open"), close: jasmine.createSpy("close") };
    c.splitDialog = splitDialog as any;
    return { c, service, splitDialog };
  }

  it("opens the apply-from dialog when the start date is unchanged", () => {
    const { c, service, splitDialog } = makeWithService();
    c.timeOff.dayOfWeek = DayOfWeek.Tuesday; // content change only; start untouched

    c.save();

    expect(splitDialog.open).toHaveBeenCalledTimes(1);
    expect(service.saveWithSplit).not.toHaveBeenCalled();
  });

  it("saves in place without the dialog when the start date was moved", () => {
    const { c, service, splitDialog } = makeWithService();
    c.timeOff.startDate = dayjs("2026-02-01"); // moved from 2026-01-05

    c.save();

    expect(splitDialog.open).not.toHaveBeenCalled();
    expect(service.saveWithSplit).toHaveBeenCalledTimes(1);
    expect(service.saveWithSplit).toHaveBeenCalledWith(c.timeOff, undefined);
  });

  it("does not open the dialog for a brand-new rule", () => {
    const { c, service, splitDialog } = makeWithService();
    c.isNew = true;

    c.save();

    expect(splitDialog.open).not.toHaveBeenCalled();
    expect(service.addNew).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `Appy/Appy-frontend/`): `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: the new "recurring save dialog gate" specs FAIL — the "saves in place" spec fails because today's `save()` opens the dialog for every recurring edit (so `saveWithSplit` is not called and `splitDialog.open` is). The other existing specs still pass.

- [ ] **Step 3: Add the `originalStartDate` field**

In `time-off-edit.component.ts`, add the field next to the other split-state fields (after the `splitDate` declaration around line 36):

```ts
  // The rule's start date as loaded (after defaulting). A recurring edit forks the timeline only
  // when the start date is unchanged; moving it is direct timeline editing → save in place. See save().
  private originalStartDate?: Dayjs;
```

- [ ] **Step 4: Capture `originalStartDate` on load**

In `ngOnInit`, in the edit (`id != null`) branch, set the baseline right after `this.timeOff = t;` (around line 117). `t.startDate` is guaranteed defined here — both the one-off and recurring branches above default a missing start to today:

```ts
        this.type = t.recurrence === TimeOffRecurrence.OneOff ? "oneoff" : "recurring";
        this.timeOff = t;
        this.originalStartDate = t.startDate;
        this.isLoaded = true;
```

- [ ] **Step 5: Gate the dialog in `save()`**

Replace the existing `save()` method (lines ~218-230) with:

```ts
  public save(): void {
    if (!this.timeOff.validate()) return;

    // A recurring edit can fork the rule's timeline — but only when the user changed the rule's
    // content (day/time/all-day), NOT its start date. Moving the start date IS editing the timeline
    // directly, so there's nothing to fork: save it in place. Gating on the start date also avoids
    // the trap where the fork dialog's date silently overrode the start the user just set.
    if (!this.isNew && this.type === "recurring") {
      const startMoved = !this.timeOff.startDate?.isSame(this.originalStartDate, "date");
      if (!startMoved) {
        this.splitMode = "date";
        this.splitDate = dayjs();
        this.splitDialog?.open();
        return;
      }
      // start date moved → plain in-place edit (no applyFrom, no dialog); fall through to commit().
    }

    this.commit();
  }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: all specs PASS, including the three new "recurring save dialog gate" specs and the existing one-off/delete specs.

- [ ] **Step 7: Check LSP diagnostics**

Confirm no TypeScript errors/unused-import warnings in the modified component. Fix any immediately.

- [ ] **Step 8: Commit**

```bash
git add Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.ts \
        Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.spec.ts
git commit -m "fix(timeoff): skip recurring fork dialog when the start date changed"
```

---

### Task 2: Reword the apply-from dialog copy (EN + HR)

**Files:**
- Modify: `Appy/Appy-frontend/src/assets/translations/en.translation.json` (keys at lines ~256-260)
- Modify: `Appy/Appy-frontend/src/assets/translations/hr.translation.json` (keys at lines ~256-260)

**Interfaces:**
- Consumes: nothing. Produces: reworded values for `APPLY_FROM_TITLE`, `APPLY_FROM_SPECIFIC`, `APPLY_FROM_ALL`, `APPLY_FROM_SPECIFIC_HINT`, `APPLY_FROM_ALL_HINT`. Keys and the template references stay identical.

- [ ] **Step 1: Update the English strings**

In `en.translation.json`, replace the five existing key/value lines:

```json
            "APPLY_FROM_TITLE": "Apply changes from",
            "APPLY_FROM_SPECIFIC": "A specific date",
            "APPLY_FROM_ALL": "The entire schedule",
            "APPLY_FROM_SPECIFIC_HINT": "Changes apply from the selected date onward. Earlier occurrences keep their current settings, splitting the schedule in two.",
            "APPLY_FROM_ALL_HINT": "Changes apply to every occurrence in this schedule — both past and future.",
```

with:

```json
            "APPLY_FROM_TITLE": "How should these changes apply?",
            "APPLY_FROM_SPECIFIC": "From a date",
            "APPLY_FROM_ALL": "All occurrences",
            "APPLY_FROM_SPECIFIC_HINT": "Past occurrences stay as they are. Your changes apply from the date you pick below onward, and this time off splits into two separate entries — before and after that date.",
            "APPLY_FROM_ALL_HINT": "Your changes apply to every occurrence, past and future, and this time off stays a single entry.",
```

- [ ] **Step 2: Update the Croatian strings**

In `hr.translation.json`, replace the five existing key/value lines:

```json
            "APPLY_FROM_TITLE": "Primijeni promjene od",
            "APPLY_FROM_SPECIFIC": "Određenog datuma",
            "APPLY_FROM_ALL": "Cijelog rasporeda",
            "APPLY_FROM_SPECIFIC_HINT": "Promjene se primjenjuju od odabranog datuma nadalje. Ranija ponavljanja zadržavaju trenutne postavke, čime se raspored dijeli na dva dijela.",
            "APPLY_FROM_ALL_HINT": "Promjene se primjenjuju na cijeli raspored — i prošla i buduća ponavljanja.",
```

with:

```json
            "APPLY_FROM_TITLE": "Kako primijeniti ove promjene?",
            "APPLY_FROM_SPECIFIC": "Od datuma",
            "APPLY_FROM_ALL": "Sva ponavljanja",
            "APPLY_FROM_SPECIFIC_HINT": "Ranija ponavljanja ostaju nepromijenjena. Promjene vrijede od datuma koji odaberete u nastavku, a ovaj slobodni dan dijeli se na dvije zasebne stavke — prije i poslije tog datuma.",
            "APPLY_FROM_ALL_HINT": "Promjene vrijede za sva ponavljanja, prošla i buduća, a ovaj slobodni dan ostaje jedna stavka.",
```

- [ ] **Step 3: Verify both files are still valid JSON**

Run (from `Appy/Appy-frontend/`):

```bash
node -e "JSON.parse(require('fs').readFileSync('src/assets/translations/en.translation.json','utf8'));JSON.parse(require('fs').readFileSync('src/assets/translations/hr.translation.json','utf8'));console.log('OK')"
```

Expected: prints `OK` (no parse error from a stray comma/quote).

- [ ] **Step 4: Commit**

```bash
git add Appy/Appy-frontend/src/assets/translations/en.translation.json \
        Appy/Appy-frontend/src/assets/translations/hr.translation.json
git commit -m "feat(timeoff): clearer wording for the recurring apply-from dialog"
```

---

### Task 3: Update the time-off page CLAUDE.md

**Files:**
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md` (the "Editor" section, the sentence beginning "Saving a recurring edit opens…")

**Interfaces:** Documentation only.

- [ ] **Step 1: Update the editor description**

Replace this sentence in the Editor section:

```
Saving a recurring edit opens an "apply changes from" dialog (a date — default today — that forks the rule's timeline via `TimeOffService.saveWithSplit` → `PUT edit?applyFrom=`; or "the entire schedule" for a plain in-place edit). The dialog shows an info hint explaining the effect of the selected mode (`APPLY_FROM_SPECIFIC_HINT` / `APPLY_FROM_ALL_HINT`).
```

with:

```
Saving a recurring edit opens the "apply changes" dialog **only when the start date was not changed** — moving the From date is direct timeline editing, so it saves in place with no fork (gated in `save()` against `originalStartDate`, captured on load). When shown, the dialog offers "From a date" (default today, forks the rule's timeline via `TimeOffService.saveWithSplit` → `PUT edit?applyFrom=`, splitting it into two entries) or "All occurrences" (a plain in-place edit). It shows an info hint explaining the effect of the selected mode (`APPLY_FROM_SPECIFIC_HINT` / `APPLY_FROM_ALL_HINT`). An end-date-only change still opens the dialog.
```

- [ ] **Step 2: Commit**

```bash
git add Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md
git commit -m "docs(timeoff): note the recurring save dialog is gated on the start date"
```

---

### Task 4: Verification

**Files:** none (verification only).

- [ ] **Step 1: Full frontend unit suite**

Run (from `Appy/Appy-frontend/`): `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: all specs PASS.

- [ ] **Step 2: Manual validation (Playwright MCP), both languages**

With backend + frontend running, in EN and HR:
- Open a recurring rule, change **only** the From date, Save → **no dialog**; reopen and confirm the new start persisted.
- Open a recurring rule, change **only the day/time**, Save → dialog shows the reworded copy. Pick "From a date" + a date → the list now shows **two** entries (before/after). Repeat and pick "All occurrences" → **one** entry, every occurrence updated.

- [ ] **Step 3: E2E (before PR)**

Per repo policy, run Cypress before opening a PR (use `run_in_background`):
Run (from `Appy/Appy-frontend/`): `npx cypress run`
Expected: the time-off specs pass (no regression).

---

## Notes for PR

Per the repo's global rule, remove `docs/superpowers/` (this plan + the spec) from the branch before opening the PR.

## Self-Review

- **Spec coverage:** behavior gate → Task 1; EN+HR reword (all 5 keys, with the split-into-two-entries hint) → Task 2; CLAUDE.md update → Task 3; unit + manual + E2E testing → Tasks 1 & 4. End-date-only-still-prompts is documented (Task 3) and left as-is (no task needed). Backend out of scope — no task. All covered.
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type consistency:** `originalStartDate?: Dayjs` used identically in field decl, `ngOnInit`, and `save()`; `saveWithSplit(timeOff, applyFrom?)` and `addNew` match the service; `"date"` unit matches existing usage.
