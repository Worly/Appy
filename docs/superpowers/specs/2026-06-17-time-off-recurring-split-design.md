# Time-Off Smart Recurring Bounds — Design

**Date:** 2026-06-17
**Status:** Approved
**Scope:** Backend (`TimeOffService`, `TimeOffController`) + Frontend (`time-off-edit`, `TimeOffService`)

## Problem

Recurring time-off rules currently store optional `StartDate`/`EndDate` bounds (null = open-ended) and `Edit` mutates the row in place. Two gaps:

1. A new open-ended recurring rule saves with `StartDate = null`, so it has no concrete "effective from". We want open-ended recurring rules to mean **today → forever**.
2. Editing a recurring rule rewrites all of its history. We want edits to **fork the timeline** — the change applies from a chosen date onward, leaving the past untouched (the "this and following events" model).

No DB schema change is required: the bounds columns and the bounds-aware `AppliesOn` / `NextOccurrenceOnOrAfter` logic already exist. A recurring rule is treated as a **timeline of segments**, one row per segment.

## Requirement 1 — Open-ended create → today → forever

Enforced **backend-side** in `TimeOffService.AddNew`:

- If `Recurrence != OneOff && StartDate == null`, set `StartDate = today`
  (`DateOnly.FromDateTime(DateTime.Today)`, consistent with the rest of the service).
- `EndDate` stays `null` (forever).
- Limit-ON create is unchanged — the user picks both bounds.

Backend is the single source of truth so the invariant can't be bypassed by a client.

## Requirement 2 — Edit a recurring rule → split

### Frontend UI

The edit form is **unchanged** (keeps the "Limit date range" toggle + From/To pickers).

On **Save** of a recurring rule, a dialog opens before the request fires:

> **Apply changes from…**
> ◉ A specific date  `[date selector — default = today, min = today]`
> ○ The entire schedule
> [Cancel] [Apply]

- **"A specific date" (X, default today)** → split. The dialog date is the new segment's start and **overrides** the form's From field.
- **"The entire schedule"** → plain in-place edit (no fork); form values applied as-is.
- **One-off edits get no dialog** — always a plain edit.

### Backend split

`Edit` gains an optional `applyFrom: DateOnly?` parameter:

- **Absent** → in-place edit (current behavior; also the path for one-offs and "entire schedule").
- **Present** → split:
  - **Original row** keeps its pre-edit values; `EndDate = X.AddDays(-1)` → becomes the historical (Past) segment.
  - **New row inserted** carries the edited DTO; `StartDate = X`; `EndDate = (limit-on ? To : null)`. This is "the duplicate" and is the value returned from `Edit`.
  - Boundary is **exclusive**: old ends the day before X, new starts on X — no day is double-covered.

### Row identity

The **original row becomes the historical segment** (keeps its id, `EndDate` clamped); the **inserted duplicate is the new/future segment**. This matches "duplicate the entity" and keeps already-elapsed occurrences attached to their original id. After save the editor calls `location.back()` and the lists refetch, so the id arrangement is invisible to the user.

## API shape

Single query param on the existing endpoint:

```
PUT /timeoff/edit/{id}?applyFrom=YYYY-MM-DD
```

- Absent → in-place edit.
- Present → split at that date.

Frontend `TimeOffService` gets a thin `save(timeOff, applyFrom?)` variant that appends the param when provided.

## Edge cases & validation

- `applyFrom <= existing.StartDate` → the old segment would be empty → **collapses to a plain in-place edit** (no orphan row created).
- Limit-on and new-segment `To < applyFrom` → existing "dates not in order" validation error fires.
- A split sets the original's `EndDate` in the past → it drops to the **Past** tab on the next refetch; the new segment appears in **Active**. (Expected.)
- One-off rules ignore `applyFrom` entirely.

## Testing

- **Backend unit (`Appy.Tests`):**
  - `AddNew` open-ended recurring stamps `StartDate = today`, `EndDate = null`.
  - `AddNew` limit-on recurring preserves both bounds.
  - `Edit` with `applyFrom` clamps the original to `X-1` and inserts a new row with `StartDate = X` and the correct end.
  - `Edit` with `applyFrom <= existing.StartDate` collapses to in-place (no extra row).
  - One-off `Edit` with `applyFrom` is ignored (plain edit).
- **Frontend unit:** dialog appears only for recurring edits, defaults to today; "entire schedule" sends no `applyFrom`; one-off save sends no `applyFrom`.
- **E2E:** touch up the recurring edit flow if covered.
