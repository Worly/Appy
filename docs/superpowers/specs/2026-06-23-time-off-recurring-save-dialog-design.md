# Time-off recurring save dialog — clearer wording + start-date fix

**Date:** 2026-06-23
**Page:** `Appy/Appy-frontend/src/app/pages/time-off/`

## Problem

When you edit a **recurring** time-off and hit Save, an "apply changes from" dialog
always opens, offering a *timeline fork* ("a specific date" vs "the entire schedule").
Two issues:

1. **Wording is unclear.** The options aren't even grammatically parallel — the title
   "Apply changes from" only composes with the date option ("Apply changes from *the
   entire schedule*" doesn't parse).

2. **The fork collides with the start-date field (the real bug).** The fork concept
   only makes sense when you change *what* the rule is (day / time / all-day). When you
   change the rule's **start date**, the dialog asks you to pick *another* date — and
   choosing the default silently destroys the change you just made.

   Concrete repro (today = Jun 23): rule starts Jan 1. Change "From" to **Feb 1**, Save.
   Dialog defaults to "a specific date" = today (Jun 23). Click Apply → `confirmSplit`
   runs `startDate = splitDate`, so your Feb 1 is thrown away, replaced with Jun 23, and
   the rule is split into two identical segments at today. Nonsense outcome.

### Root cause

A recurring rule is `{content: day/time/all-day/label/notes}` + `{bounds: startDate, endDate}`.
Moving the bounds **is** editing the timeline directly — there is nothing to "fork". The
fork question only belongs to content changes. Today the dialog fires on every recurring
edit regardless, so editing the start date triggers a fork prompt that fights the field.

## Solution

Two changes: a behavior gate, and a full reword. The backend fork (`TimeOffService.Edit`
with `applyFrom`) and the frontend `confirmSplit` logic are **unchanged** — they simply
stop running in the start-date case.

### 1. Behavior — gate the dialog on the start date

In `TimeOffEditComponent`:

- Capture the rule's start date when it loads (`originalStartDate`), after the existing
  "default a missing start to today" step in `ngOnInit` (so it reflects the value the user
  actually sees in the field). Invariant: recurring rules always have a `startDate` by the
  time the form renders, so `originalStartDate` is always a defined `Dayjs`.
- In `save()`, for a recurring edit (`!isNew && type === "recurring"`):
  - If `timeOff.startDate` differs from `originalStartDate` (compared by `"date"`) →
    **`commit()` in place** — no dialog, no `applyFrom`. The backend does a plain edit and
    the new start sticks.
  - Otherwise → open the dialog exactly as today (`splitMode = "date"`, `splitDate = today`).
- `confirmSplit` is untouched. It now only ever runs when the start date was **not**
  moved, so its `startDate = splitDate` line can no longer clobber a user edit.

Sketch:

```ts
// field
private originalStartDate?: Dayjs;

// ngOnInit, recurring/edit branch, after defaulting startDate:
this.originalStartDate = t.startDate;

// save()
if (!this.isNew && this.type === "recurring") {
  const startMoved = !this.timeOff.startDate?.isSame(this.originalStartDate, "date");
  if (!startMoved) {
    this.splitMode = "date";
    this.splitDate = dayjs();
    this.splitDialog?.open();
    return;
  }
  // start date moved → in-place save, no fork, no dialog → falls through to commit()
}
this.commit();
```

**Deliberately unchanged:** an **end-date-only** change still opens the dialog. The gate is
scoped to the start date only (per product decision). The date picker inside the dialog is
also kept — users can still fork at a chosen (e.g. future) date.

### 2. Wording — reword the `APPLY_FROM_*` keys (no template changes)

Reuse the existing keys in `src/assets/translations/{en,hr}.translation.json`; only the
values change. The vocabulary is unified on **"occurrences" / "ponavljanja"** (already used
in the hints), dropping the vague "schedule / raspored".

| Key | English | Croatian |
|---|---|---|
| `APPLY_FROM_TITLE` | How should these changes apply? | Kako primijeniti ove promjene? |
| `APPLY_FROM_SPECIFIC` | From a date | Od datuma |
| `APPLY_FROM_ALL` | All occurrences | Sva ponavljanja |
| `APPLY_FROM_SPECIFIC_HINT` | Past occurrences stay as they are. Your changes apply from the date you pick below onward, and this time off splits into two separate entries — before and after that date. | Ranija ponavljanja ostaju nepromijenjena. Promjene vrijede od datuma koji odaberete u nastavku, a ovaj slobodni dan dijeli se na dvije zasebne stavke — prije i poslije tog datuma. |
| `APPLY_FROM_ALL_HINT` | Your changes apply to every occurrence, past and future, and this time off stays a single entry. | Promjene vrijede za sva ponavljanja, prošla i buduća, a ovaj slobodni dan ostaje jedna stavka. |

The `APPLY_FROM_SPECIFIC_HINT` now states the concrete consequence (the row splits into
two entries); `APPLY_FROM_ALL_HINT` mirrors it (stays one entry) for contrast.

## Files touched

- `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.ts`
  — `originalStartDate` capture + `save()` gate.
- `Appy/Appy-frontend/src/assets/translations/en.translation.json` — reword 5 keys.
- `Appy/Appy-frontend/src/assets/translations/hr.translation.json` — reword 5 keys.
- `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md` — note the dialog is skipped when
  the start date was changed (saves in place).
- `Appy/Appy-frontend/src/app/pages/time-off/components/time-off-edit/time-off-edit.component.spec.ts`
  — add coverage for the gate.

The generated `Appy-frontend/build/assets/translations/*.json` are build artifacts — do not
hand-edit.

## Testing

Unit (`time-off-edit.component.spec.ts`):
- Recurring edit, **start date moved** → `save()` commits in place (no dialog opened, no
  `applyFrom` passed to the service).
- Recurring edit, **start date unchanged**, content changed → `save()` opens the dialog.
- Existing dialog/`confirmSplit` behavior still passes (fork at a chosen date when start
  unchanged).

Manual (Playwright MCP), both languages:
- Open a recurring rule, change only "From", Save → no dialog, the new start persists.
- Open a recurring rule, change the day/time only, Save → dialog shows reworded copy;
  "From a date" fork produces two list entries; "All occurrences" keeps one.

## Out of scope

- Backend changes (the fork + `applyFrom` API are correct and unchanged).
- End-date-only edits (still prompt — intentional).
- Removing the in-dialog date picker (kept — future-dated changeovers stay possible).
