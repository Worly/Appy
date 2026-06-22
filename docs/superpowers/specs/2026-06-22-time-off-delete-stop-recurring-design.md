# Time Off — "Stop" instead of delete for recurring rules

**Date:** 2026-06-22
**Branch:** feature/54-time-off

## Problem

Deleting a recurring time-off rule hard-deletes the row, erasing its history. There is
no way to simply *stop* a rule going forward while keeping the occurrences it already
produced. This mirrors a gap relative to the edit flow, which already lets the user fork
a recurring rule's timeline from a chosen date ("apply changes from").

## Goal

When deleting a recurring time off, offer a choice:

- **End it** — stop the rule at yesterday (keep past occurrences as history), or
- **Delete entirely** — the existing hard delete.

"Stop" ends the rule at **yesterday** (`today − 1`) as a single confident action — no
date picker. (Editing a specific end date is already possible via the editor's
"Set an end date" toggle, so a picker here would duplicate that.)

## Scope

- **Recurring rules only.** A one-off is already a bounded date range; one-off delete is
  unchanged (immediate).
- **The dialog appears only when "stop" is meaningful** — i.e. the rule is recurring,
  has already started, and is still active:
  `recurrence !== OneOff && startDate < today && (endDate == null || endDate >= today)`.
  For expired rules, future-dated rules, or rules starting today, "end yesterday" would
  produce zero occurrences (equivalent to a delete), so those keep the current immediate
  delete with no dialog.
- No change to one-off delete, to the no-confirmation behaviour of the immediate-delete
  paths, or to the edit/apply-from flow.

## Approach (chosen: A — dedicated stop operation + edit-consistent dialog)

A distinct, self-documenting backend operation plus a dialog that reuses the visual
language of the recently shipped apply-from dialog. Chosen over reusing the in-place edit
(less explicit, conflates "stop" with "edit") and over a two-button dialog (diverges from
the edit dialog's pattern).

### Backend

**`TimeOffController`** — new endpoint:

```csharp
[HttpPut("stop/{id}")]
[Authorize]
public async Task<ActionResult<TimeOffDTO>> StopRecurring(int id)
{
    var result = await this.timeOffService.StopRecurring(id, HttpContext.SelectedFacility());
    return Ok(result.GetDTO());
}
```

**`ITimeOffService` / `TimeOffService`** — new method:

```csharp
Task<TimeOff> StopRecurring(int id, int facilityId);
```

Behaviour:
1. Load the rule scoped to the facility; throw `NotFoundException` if missing.
2. Reject a one-off: throw `ValidationException` (it has no "going forward" to stop).
3. Set `EndDate = DateOnly.FromDateTime(DateTime.Today).AddDays(-1)` (yesterday).
4. Guard against moving the end *later* than it already is: if the rule already ends
   before yesterday, leave it unchanged (no-op) — so stopping never resurrects/extends an
   already-expired rule. (The frontend only calls this for active rules, so this is a
   safety net.)
5. `SaveChangesAsync`, return the updated rule.

This reuses the same "clamp `EndDate`" semantics the edit-fork already applies to the
historical segment (`t.EndDate = applyFrom - 1`).

### Frontend

**`TimeOffService`** — new method:

```ts
public stop(timeOff: TimeOff): Observable<TimeOff> {
  // PUT timeOff/stop/{id}; must invalidate the same keys as delete so the rule
  // moves from the Active list to Past and the appointment view refreshes.
}
```

It must invalidate `timeOffKeys.all` and `appointmentKeys.all` exactly as the
`BaseModelService` delete/save mutations do.

**`TimeOffEditComponent`** (`.ts` / `.html`):

- A `canStop()` predicate encodes the scope rule above.
- `delete()` becomes: if `!isNew && canStop()` → open a new `#deleteDialog`; otherwise →
  the existing immediate delete.
- Dialog state: `deleteMode: "stop" | "remove"` (default `"stop"`).
- Dialog markup mirrors the existing `#splitDialog`: an `app-segmented-control`
  `[End it · keep history | Delete entirely]`, an info hint (`circle-info` icon) that
  explains the selected mode, and Cancel / Confirm buttons.
- Confirm routes to `stopRecurring()` (calls `TimeOffService.stop`) or the existing
  `delete()`, both navigating back on success and clearing `isLoading` on error.

### i18n

New keys in `src/assets/translations/en.json` and `hr.json` under `pages.time-off`:

- `DELETE_TITLE` — dialog title (e.g. "Delete time off")
- `DELETE_MODE_STOP` / `DELETE_MODE_STOP_HINT` — "End it" + "Past occurrences are kept; it
  won't apply from today onward."
- `DELETE_MODE_REMOVE` / `DELETE_MODE_REMOVE_HINT` — "Delete entirely" + "Removes the rule
  and all of its history."

Reuse existing `CANCEL` and `DELETE` keys for the buttons.

## Testing

- **Backend unit test** (`Appy.Tests`): `StopRecurring` clamps `EndDate` to yesterday for
  an active recurring rule; is a no-op when the rule already ends before yesterday;
  rejects a one-off with a `ValidationException`; throws `NotFoundException` for a missing
  / wrong-facility id.
- **Frontend component spec**: `delete()` opens the dialog only when `canStop()` is true;
  confirm in `stop` mode calls `TimeOffService.stop`; `remove` mode calls `delete`;
  one-off / inactive rules delete immediately without a dialog.
- **E2E (optional)**: Cypress — on an active recurring rule, delete → "End it" moves the
  rule to the Past scope while keeping it visible; "Delete entirely" removes it.

## Documentation

Update CLAUDE.md files for the changed units:
- `pages/time-off/CLAUDE.md` — editor delete now offers "End it" (stop at yesterday) vs
  "Delete entirely" for active, started recurring rules.
- `Appy/Services/CLAUDE.md` — `TimeOffService.StopRecurring`.
- `Appy/Controllers/CLAUDE.md` — `PUT /timeoff/stop/{id}`.

## Out of scope

- A user-pickable stop date (the editor's end-date toggle already covers that).
- Stopping one-off rules.
- Adding confirmation to the existing immediate-delete paths.
