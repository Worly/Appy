# Design: Batch-load previous appointments (fix N+1 in AppointmentService)

**Issue:** [#78](https://github.com/Worly/Appy/issues/78) — N+1 query risk in `AppointmentService.GetAll()` when `findPrevious=true`.

## Problem

`AppointmentService.GetAll()` (lines 47–63) and `GetList()` (lines 86–100) project each
appointment into an anonymous type whose `previous` field is a **correlated subquery**
against `context.Appointments`. EF Core emits one extra database round-trip per row, so a
page of N appointments triggers N+1 queries. Performance degrades linearly with page size.

The two methods contain the **identical** correlated subquery, so both are fixed together
with one shared helper (confirmed in scope with the issue owner).

## Fix

Introduce a private batched helper:

```csharp
private async Task<Dictionary<int, AppointmentViewDTO?>> GetPreviousAppointments(
    List<Appointment> appointments, int facilityId)
```

Algorithm:

1. Empty input → return empty dictionary (short-circuit).
2. `clientIds = appointments.Select(a => a.ClientId).Distinct()`.
3. `maxDate = appointments.Max(a => a.Date)`.
4. **One query**: load all appointments for `facilityId` where
   `clientIds.Contains(ClientId) && Date <= maxDate`, with `.Include(Service).Include(Client)`;
   materialize to a list.
5. Group candidates by `ClientId`; order each group **descending by (Date, Time, Duration)**.
6. For each input appointment, select the first candidate strictly before it:
   `Date < a.Date || (Date == a.Date && Time < a.Time)`; map via `ToViewDTO(null)`.
7. Return a dictionary keyed by appointment `Id` (value null when no earlier appointment).

`GetAll()` / `GetList()` are rewritten to:

1. Build the base query (`Include` + `Where` + `ApplySmartFilter` + ordering/paging).
2. `var page = await query.ToListAsync();` — **query #1**.
3. If previous is not needed (`GetAll` with `findPrevious=false`): map all rows with `null` previous.
4. Otherwise: `var prev = await GetPreviousAppointments(page, facilityId);` — **query #2** — then
   map each row with `prev.GetValueOrDefault(a.Id)`.

Result: **exactly two queries regardless of page size** (one for `GetAll` with
`findPrevious=false`).

## Correctness equivalence

- Original: filter by the before-predicate, then `OrderByDescending(Date, Time, Duration)`,
  then `FirstOrDefault`.
- New: order candidates descending, then take the first matching the before-predicate.

Both select the maximum `(Date, Time, Duration)` row among candidates earlier than the target —
provably the same result, including the `Duration` tiebreaker for same-`(Date,Time)` rows.

The `Date <= maxDate` bound never drops a valid "previous": any previous appointment's date is
≤ its target row's date ≤ `maxDate`.

The single-row helper `GetPreviousAppointment(Appointment)` used by
`GetById` / `AddNew` / `Edit` / `SetStatus` is unchanged — one extra query for a single record
is not an N+1 problem.

## Testing

The unit suite mocks `MainDbContext.Appointments` over a `List<>` via `Moq.EntityFrameworkCore`,
so all LINQ executes as LINQ-to-objects — SQL round-trips are not observable. The N+1 is instead
observed through **getter access count**: the old correlated subquery reads the
`context.Appointments` getter once per row; the new code reads it a fixed number of times.

- **Query-count guard (red-first test):** seed N appointments across distinct clients, call
  `GetAll(findPrevious:true)`, then assert `dbContextMock.VerifyGet(x => x.Appointments)` does
  **not** scale with N. Old code → N+1 accesses (RED); new code → constant (GREEN). Same guard
  for `GetList`.
- **Characterization tests (lock correctness across the refactor):**
  - previous resolves to the most-recent prior-day appointment for the same client;
  - same-day, earlier-time appointment resolves correctly (the per-row distinction);
  - per-client isolation (client A's previous is never client B's appointment);
  - `null` when no earlier appointment exists;
  - `GetList` forwards and backwards attach the correct previous.

## Documentation

- Update `Appy.Tests/CLAUDE.md` to note the new `findPrevious` / query-batching coverage.
- `Appy/Services/CLAUDE.md` does not describe query internals — no change required.

## Out of scope

- No API/DTO shape changes; `AppointmentViewDTO.PreviousAppointment` is unchanged.
- No change to `GetPreviousAppointment(Appointment)` single-record behavior.
