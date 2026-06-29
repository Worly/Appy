# Automatic Holiday Import — Design

**Issue:** [#141 — Implement automatic holiday import for the Holidays tab](https://github.com/Worly/Appy/issues/141)
**Date:** 2026-06-29

## Summary

Let a facility owner auto-import their country's public holidays so those days block bookings the same way other time-off does — instead of hand-creating a time-off entry per holiday. Imported holidays are clearly distinguishable from manual time-off, individually editable within tight limits, removable, and revertible to their original imported values.

## Goals (the five requirements)

1. The owner chooses a **country** whose public holidays are imported.
2. The owner can **edit** an imported holiday, but only: its **date** (single day — never multi-day), its **time** (turn off all-day to set a time range), and **notes**.
3. It is **clear which holidays were edited** and **what the original values were**.
4. The owner can **remove** an imported holiday.
5. The owner can **revert** an imported holiday to its original values — and this includes **bringing a removed holiday back**.

## Non-goals (YAGNI)

- Per-field revert (revert is whole-holiday). With only date/time/notes, "revert just the date" is marginal and adds real cost.
- Review-and-select-which-holidays at import time. Import is all-or-nothing; the owner refines afterward by removing individual holidays.
- Preserving a facility's edits/removals across a country change (they're discarded — see *Configure flow*).
- A "removed **and** edited" combined state — removing a holiday discards its edits (it falls out of the model naturally; see *Data model*).

---

## UX Design

The Holidays tab already exists in `TimeOffComponent` as a stub: a tab, the shared **Upcoming | History** scope switch, and an icon-only gear **"configure auto-import"** button (currently a no-op). All of the work below **extends existing components** — no new pages, routes, or parallel component trees.

### State model

An imported holiday is always in exactly one of three states, each one step from the original:

```
 default ──edit──▶ edited ──revert──▶ default
 default ─remove─▶ removed ─restore─▶ default
```

There is no "edited + removed": **removing discards edits**, so a removed holiday is always at original values, and Restore brings it back to the original. Revert (on an edited holiday) and Restore (on a removed one) are the same underlying operation — *make the holiday match its original imported values* — labelled by context.

### Empty state (nothing imported yet)

The Holidays tab shows an umbrella empty state with a primary **"Choose a country"** CTA. The gear remains in the controls row for reconfiguring later.

### Configure dialog (gear / CTA)

A small dialog built from the shared `app-dialog` shell, hosted by `TimeOffComponent`:

- A single **Country** dropdown (the supported-country list comes from the backend). The whole feature is modelled as one setting — *which country, or none* — not a country picker plus a separate on/off toggle.
- A reassurance preview line: e.g. `14 public holidays a year · next: Corpus Christi, 4 Jun`.
- Footer: **Cancel** / **Import**.
- A secondary **"Turn off & remove imported holidays"** action when already configured.

If a chosen country/API exposes **subdivisions** (e.g. US states, German Länder), the dialog gains an optional **Region** select. This is deferred until the holiday library/region requirements are confirmed (see *Open questions*); country-only is the baseline.

**Changing or clearing the country** discards that facility's imported holidays and any edits/removals. If any edits/removals exist, show a confirmation first (`You'll lose changes to 3 holidays`); if none, switch silently.

### List (Holidays tab)

Reuses the existing `app-time-off-list` + `app-single-time-off-list-item` row anatomy — a thin amber **accent bar**, the info block (name + `date · weekday` + time/All day), and the faded umbrella icon — sourced from a holiday list endpoint so it can include removed holidays (which have no TimeOff). State is conveyed **inside the content area**, keeping the accent bar otherwise static:

- **Untouched:** plain row.
- **Edited:** an amber **"Edited"** badge beside the name. No inline originals (the default is always all-day with no note, so blanket "originally…" lines would be noise).
- **Removed:** row **dimmed + name struck through**, a grey **"Removed"** badge, and the **accent bar greyed**.

Reuses the shared **Upcoming | History** scope switch. Upcoming = holidays on/after today; History = past — paginating by year in each direction. Rows sort by **effective date** (the current date for active/edited rows, the original date for removed rows).

Tapping any row opens the details view.

### Details view (read-only) — extends `app-single-time-off`

The existing details dialog detects the imported link and adds holiday treatment, so it also reads correctly when opened from the **appointments** view (where `SingleTimeOffComponent` is already reused):

- A provenance line: `🏖 Public holiday · Croatia`.
- Read-only current values (Date, Time/All day, Notes).
- **If edited:** a grouped **"Changed from original"** block listing only what differs, as before→after (`Date  6 Apr → 13 Apr`, `Time  All day → 12:00–17:00`), with a single **"↩ Revert to original"** action below it. Originals are quarantined in this one block so the fields stay clean.
- **If removed:** a banner — `You removed this holiday. It won't block bookings.` — with **"↩ Restore"**, and the fields shown greyed.
- Footer (active/edited): **Remove** and **Edit**.

### Editor — extends `TimeOffEditComponent`

A holiday's blocking row is a one-off, single-day TimeOff, which this editor already handles (including dragging the To date with the From date so a single-day range stays single-day). For an imported holiday it is constrained:

- **Name** is shown locked (it is the holiday name; not editable).
- **Date:** single date picker (moving it never produces a multi-day span).
- **All day** toggle → reveals a time range when off (pre-filled 09:00–17:00 like other time-off).
- **Notes.**
- **Remove** replaces the generic delete; no recurrence controls, no apply-from dialog.

Editing changes the linked TimeOff; backend validation keeps an imported holiday's TimeOff single-day and its label intact.

### Remove

Removal is immediate with **no confirmation dialog** — it is reversible via Restore. (Removing an *edited* holiday discards those edits, which Restore will not bring back; edits are trivial to redo, so this is acceptable. An optional inline note in the editor footer can mention it.)

---

## Data Model

```
HolidayImportSettings (per facility)
  FacilityId            (PK/FK, one row per facility)
  CountryCode           ISO country code; null ⇒ not configured
  Subdivision           optional region code (deferred)

ImportedHoliday (per facility, per holiday occurrence)
  Id
  FacilityId            (FK)
  Name                  holiday name (used as the TimeOff label)
  OriginalDate          the library-computed date — IMMUTABLE; the import job's match key
  (the original snapshot is just OriginalDate + Name: imported holidays are
   always all-day with no note, so no other original fields are needed)

TimeOff (existing, gains one nullable FK)
  …existing fields (StartDate, EndDate, IsAllDay, StartTime, EndTime, Label, Notes, Recurrence…)
  ImportedHolidayId     nullable FK → ImportedHoliday; its presence is the
                        "this is an imported holiday" flag
```

### How the three states map to rows

- **Active / edited** → an `ImportedHoliday` **with** a linked `TimeOff` (a one-off, single-day TimeOff whose `Label` = `Name`). *Edited* = the TimeOff's date/time/notes differ from the snapshot (`StartDate ≠ OriginalDate`, or `IsAllDay = false`, or `Notes` non-empty).
- **Removed** → an `ImportedHoliday` with **no** linked TimeOff (the row was deleted). It cannot block bookings, but the `ImportedHoliday` record persists so it still lists as "Removed" and the import job (matching on `OriginalDate`) will not recreate it. **No `IsRemoved` flag** — absence of the TimeOff *is* the removed state.

This is why removal discards edits for free: deleting the TimeOff deletes the row that held them.

### Why this shape wins

Active holidays are ordinary `TimeOff` rows, so **booking-block, calendar expansion, and appointment bundling are untouched** — they already include these rows. `TimeOff` is not polluted with snapshot columns; provenance and the original snapshot live on `ImportedHoliday`.

---

## Backend

### Holiday source

Use the **Nager.Date hosted REST API** (`date.nager.at`, v3) — **free, no API key, no auth, no rate limits**:

- Holidays: `GET /api/v3/PublicHolidays/{year}/{countryCode}`
- Supported countries: `GET /api/v3/AvailableCountries`

Each holiday returns `date`, `localName`, `name`, `countryCode`, `global`, `subdivisionCodes`, and `types`, so we get the localized name and subdivision data directly. We store **`localName`** as the holiday `Name` — always the country's own language, independent of the app's UI language (per requirement).

The offline **NuGet/Docker** variants of Nager.Date require a paid sponsorship license for commercial use, so they are avoided. The hosted API is acceptable here precisely because of the materialization design: holidays are fetched only by the daily job and on-configure, cached per (country, year), and stored in our DB — **runtime booking and list queries never touch the API**, so its availability is on no hot path (a transient outage merely delays a new-year import by a day).

Wrap the provider behind an `IHolidayProvider` interface (fetch holidays for a country + year; list supported countries) so we can later swap to the licensed offline NuGet, the MIT **PublicHoliday** library (fully free / offline, but with less consistent localized names), or a self-hosted Nager Docker instance — without touching the rest of the system.

### Operations (a `HolidayService` / `HolidayController`, keeping holiday rules in one place)

- **Get supported countries** — for the configure dropdown.
- **Get / save settings** — read or set the facility's country. Saving a new country triggers an immediate materialization (so results appear at once); changing/clearing deletes the facility's `ImportedHoliday` rows and their linked TimeOffs.
- **List holidays** (Upcoming/History, paged by year) — queries `ImportedHoliday` left-joined to its `TimeOff`, derives the edited state, returns holiday DTOs (including removed ones).
- **Edit** — updates the linked TimeOff (date single-day, all-day/time, notes). Validates that an imported holiday's TimeOff stays one-off, single-day, label unchanged.
- **Remove** — deletes the linked TimeOff (the `ImportedHoliday` persists).
- **Revert / Restore** — ensures a TimeOff matching the snapshot exists (all-day on `OriginalDate`, label `Name`, no notes) and is linked; one operation serves both the edited and removed cases.

Mutations invalidate the same cache keys as time-off mutations so the time-off lists and appointment list refetch.

### Daily import job

A once-per-day job via `CronScheduler` (same mechanism as `AppointmentReminderService`). For each configured facility, materialize any not-yet-present holidays out to **today + 1 year**: fetch the source's holidays for the range, and for each whose `OriginalDate` has no existing `ImportedHoliday` for that facility, create the `ImportedHoliday` + its linked TimeOff. Existing records (including removed ones — `ImportedHoliday` present, no TimeOff) are skipped, so removals and edits are never clobbered and removed holidays are never resurrected. `ImportedHoliday` rows are **retained indefinitely** (no pruning of past occurrences).

---

## Frontend

- **Models:** a `Holiday` view model (name, effective date, all-day/time, notes, `isEdited`, `isRemoved`, and the original date for the Changes block) + a settings model.
- **Service:** a holiday service for list / edit / remove / revert / get-settings / save-settings / supported-countries, invalidating the relevant cache keys.
- **Components — extended, not added:**
  - `TimeOffComponent` — wire the gear and empty-state CTA to the configure dialog; host the Holidays list.
  - `app-time-off-list` / `app-single-time-off-list-item` — render the holiday list (badge, dim/strike, grey accent bar) from the holiday DTO.
  - `app-single-time-off` — provenance line, Changes block + Revert, removed banner + Restore; reused as-is by the appointments view.
  - `TimeOffEditComponent` — a holiday mode: locked name, single-day date, all-day/time, notes, Remove.
  - Configure dialog — built from `app-dialog` + the existing dropdown pattern, inside `TimeOffComponent`.

---

## Requirements traceability

| # | Requirement | Where |
|---|-------------|-------|
| 1 | Choose country | Configure dialog + `HolidayImportSettings` |
| 2 | Edit date (single-day) / time / notes only | Constrained `TimeOffEditComponent`; backend validation |
| 3 | Clear which were edited + originals | "Edited" badge in list; grouped "Changed from original" block in details |
| 4 | Remove | Remove deletes the linked TimeOff; "Removed" treatment in list/details |
| 5 | Revert to original incl. un-delete | Single Revert/Restore op; removed = no TimeOff, restore recreates from snapshot |

---

## Open questions

- **Subdivisions/regions:** confirm whether the baseline countries need region selection. The source exposes `subdivisionCodes`, so if needed, add the optional Region select to the configure dialog and `Subdivision` to settings. Country-only otherwise.

## Resolved during review

- **Holiday names** always use the source's `localName` (the import country's own language), regardless of the app's UI language.
- **No pruning** — `ImportedHoliday` rows are kept indefinitely.
- **Holiday source** is the free Nager.Date hosted REST API (not the licensed offline NuGet); see *Backend → Holiday source*.
