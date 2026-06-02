# Batched Previous-Appointment Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the N+1 query in `AppointmentService.GetAll()` and `GetList()` by batch-loading each row's "previous appointment" in a single query instead of a per-row correlated subquery.

**Architecture:** Both methods materialize their page with one query, then (when previous appointments are needed) call a shared private helper `GetPreviousAppointments` that loads all candidate prior appointments for the involved clients in one more query and resolves each row's previous in memory. Net: exactly two queries regardless of page size. Output is byte-for-byte equivalent to today's behavior.

**Tech Stack:** ASP.NET Core 8, EF Core (Npgsql), xUnit + Moq + Moq.EntityFrameworkCore.

---

## File Structure

- **Modify:** `Appy/Services/AppointmentService.cs` — rewrite `GetAll` (lines 39–68) and `GetList` (lines 70–101); add private `GetPreviousAppointments` helper. The existing single-row `GetPreviousAppointment(Appointment)` helper is left untouched.
- **Modify (tests):** `Appy.Tests/Services/AppointmentServiceTests.cs` — add a `Seed(...)` helper and new tests for `GetAll`/`GetList` `findPrevious` correctness and query-count.
- **Modify (docs):** `Appy.Tests/CLAUDE.md` — note the new coverage.

`Appy/Services/CLAUDE.md` does not describe query internals — no change.

---

## Task 1: Batch previous-appointment loading in `GetAll`

**Files:**
- Modify: `Appy/Services/AppointmentService.cs:39-68` (GetAll) and add helper near line 316
- Test: `Appy.Tests/Services/AppointmentServiceTests.cs`

- [ ] **Step 1: Add a flexible seeding helper to the test class**

Add this private method to `AppointmentServiceTests` (next to the existing `AddAppointment` helper, after line 68):

```csharp
private Appointment Seed(int id, DateOnly date, TimeOnly time, Client client)
{
    var appointment = new Appointment
    {
        Id = id,
        FacilityId = FacilityId,
        Date = date,
        Time = time,
        Duration = TimeSpan.FromMinutes(30),
        ServiceId = service1.Id,
        Service = service1,
        ClientId = client.Id,
        Client = client,
        Status = AppointmentStatus.Unconfirmed,
    };
    appointments.Add(appointment);
    return appointment;
}
```

- [ ] **Step 2: Write the GetAll characterization + query-count tests**

Append these tests to `AppointmentServiceTests`:

```csharp
[Fact]
public async Task GetAll_FindPrevious_AttachesMostRecentEarlierAppointment()
{
    Seed(1, new DateOnly(2030, 1, 10), new TimeOnly(10, 0), client1);
    Seed(2, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client1);

    var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

    var view = Assert.Single(result);
    Assert.Equal(2, view.Id);
    Assert.NotNull(view.PreviousAppointment);
    Assert.Equal(1, view.PreviousAppointment!.Id);
}

[Fact]
public async Task GetAll_FindPrevious_ResolvesSameDayEarlierTime()
{
    Seed(1, new DateOnly(2030, 1, 15), new TimeOnly(9, 0), client1);
    Seed(2, new DateOnly(2030, 1, 15), new TimeOnly(11, 0), client1);

    var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

    var firstView = result.Single(a => a.Id == 1);
    var secondView = result.Single(a => a.Id == 2);
    Assert.Null(firstView.PreviousAppointment);
    Assert.NotNull(secondView.PreviousAppointment);
    Assert.Equal(1, secondView.PreviousAppointment!.Id);
}

[Fact]
public async Task GetAll_FindPrevious_IsolatesByClient()
{
    Seed(1, new DateOnly(2030, 1, 10), new TimeOnly(10, 0), client1);
    Seed(2, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client2);
    Seed(3, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client1);

    var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

    var client1View = result.Single(a => a.Id == 3);
    var client2View = result.Single(a => a.Id == 2);
    Assert.Equal(1, client1View.PreviousAppointment!.Id);
    Assert.Null(client2View.PreviousAppointment);
}

[Fact]
public async Task GetAll_FindPrevious_NullWhenNoEarlierAppointment()
{
    Seed(1, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client1);

    var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

    Assert.Null(Assert.Single(result).PreviousAppointment);
}

[Fact]
public async Task GetAll_FindPrevious_DoesNotQueryPerRow()
{
    for (int i = 0; i < 10; i++)
    {
        var client = new Client { Id = 100 + i, FacilityId = FacilityId, Name = $"C{i}", Contacts = new() };
        Seed(200 + i, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client);
    }

    await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

    // One query for the page + one batched query for previous appointments.
    // The old correlated-subquery implementation read the DbSet once per row (N+1).
    dbContextMock.VerifyGet(x => x.Appointments, Times.AtMost(2));
}
```

- [ ] **Step 3: Run the tests to confirm the query-count test fails (RED)**

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests"`
Expected: the four characterization tests PASS (current code is functionally correct), and `GetAll_FindPrevious_DoesNotQueryPerRow` **FAILS** — `Moq.MockException`, expected at most 2 getter calls but observed 11 (10 rows + 1).

- [ ] **Step 4: Add the batched helper and rewrite `GetAll`**

In `Appy/Services/AppointmentService.cs`, replace the entire `GetAll` method (lines 39–68) with:

```csharp
public async Task<List<AppointmentViewDTO>> GetAll(DateOnly date, int facilityId, bool findPrevious, SmartFilter? filter)
{
    var appointments = await context.Appointments
        .Include(a => a.Service)
        .Include(a => a.Client)
        .Where(s => s.FacilityId == facilityId && s.Date == date)
        .ApplySmartFilter(filter)
        .ToListAsync();

    if (!findPrevious)
        return appointments.Select(a => a.ToViewDTO(null)).ToList();

    var previousById = await GetPreviousAppointments(appointments, facilityId);
    return appointments.Select(a => a.ToViewDTO(previousById.GetValueOrDefault(a.Id))).ToList();
}
```

Then add this private helper immediately above the existing `GetPreviousAppointment` method (before line 316):

```csharp
private async Task<Dictionary<int, AppointmentViewDTO?>> GetPreviousAppointments(List<Appointment> appointments, int facilityId)
{
    var result = new Dictionary<int, AppointmentViewDTO?>();
    if (appointments.Count == 0)
        return result;

    var clientIds = appointments.Select(a => a.ClientId).Distinct().ToList();
    var maxDate = appointments.Max(a => a.Date);

    var candidates = await context.Appointments
        .Include(a => a.Service)
        .Include(a => a.Client)
        .Where(s => s.FacilityId == facilityId && clientIds.Contains(s.ClientId) && s.Date <= maxDate)
        .ToListAsync();

    var byClient = candidates
        .GroupBy(c => c.ClientId)
        .ToDictionary(
            g => g.Key,
            g => g.OrderByDescending(s => s.Date)
                  .ThenByDescending(s => s.Time)
                  .ThenByDescending(s => s.Duration)
                  .ToList());

    foreach (var a in appointments)
    {
        AppointmentViewDTO? previous = null;
        if (byClient.TryGetValue(a.ClientId, out var clientAppointments))
        {
            var prev = clientAppointments.FirstOrDefault(s =>
                s.Date < a.Date || (s.Date == a.Date && s.Time < a.Time));
            previous = prev?.ToViewDTO(null);
        }
        result[a.Id] = previous;
    }

    return result;
}
```

- [ ] **Step 5: Run the tests to confirm they pass (GREEN)**

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests"`
Expected: all `GetAll_*` tests PASS, including `GetAll_FindPrevious_DoesNotQueryPerRow` (now exactly 2 getter calls), and the pre-existing `Edit_*` / `AddNew_*` tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add Appy/Services/AppointmentService.cs Appy.Tests/Services/AppointmentServiceTests.cs
git commit -m "fix(appointments): batch-load previous appointments in GetAll to kill N+1 (#78)"
```

---

## Task 2: Reuse the batched helper in `GetList`

**Files:**
- Modify: `Appy/Services/AppointmentService.cs:70-101` (GetList)
- Test: `Appy.Tests/Services/AppointmentServiceTests.cs`

- [ ] **Step 1: Write the GetList characterization + query-count tests**

Append these tests to `AppointmentServiceTests`:

```csharp
[Fact]
public async Task GetList_Forwards_AttachesPrevious()
{
    Seed(1, new DateOnly(2030, 1, 10), new TimeOnly(10, 0), client1);
    Seed(2, new DateOnly(2030, 1, 20), new TimeOnly(10, 0), client1);

    var result = await service.GetList(new DateOnly(2030, 1, 15), Direction.Forwards, skip: 0, take: 10, filter: null, facilityId: FacilityId);

    var view = Assert.Single(result);
    Assert.Equal(2, view.Id);
    Assert.NotNull(view.PreviousAppointment);
    Assert.Equal(1, view.PreviousAppointment!.Id);
}

[Fact]
public async Task GetList_Backwards_NullWhenNoEarlier()
{
    Seed(1, new DateOnly(2030, 1, 10), new TimeOnly(10, 0), client1);

    var result = await service.GetList(new DateOnly(2030, 1, 15), Direction.Backwards, skip: 0, take: 10, filter: null, facilityId: FacilityId);

    var view = Assert.Single(result);
    Assert.Equal(1, view.Id);
    Assert.Null(view.PreviousAppointment);
}

[Fact]
public async Task GetList_DoesNotQueryPerRow()
{
    for (int i = 0; i < 10; i++)
    {
        var client = new Client { Id = 100 + i, FacilityId = FacilityId, Name = $"C{i}", Contacts = new() };
        Seed(200 + i, new DateOnly(2030, 1, 20), new TimeOnly(10, 0), client);
    }

    await service.GetList(new DateOnly(2030, 1, 15), Direction.Forwards, skip: 0, take: 50, filter: null, facilityId: FacilityId);

    dbContextMock.VerifyGet(x => x.Appointments, Times.AtMost(2));
}
```

- [ ] **Step 2: Run the tests to confirm the query-count test fails (RED)**

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests"`
Expected: `GetList_Forwards_AttachesPrevious` and `GetList_Backwards_NullWhenNoEarlier` PASS; `GetList_DoesNotQueryPerRow` **FAILS** (11 getter calls observed, at most 2 expected).

- [ ] **Step 3: Rewrite `GetList`**

In `Appy/Services/AppointmentService.cs`, replace the entire `GetList` method (lines 70–101) with:

```csharp
public async Task<List<AppointmentViewDTO>> GetList(DateOnly date, Direction direction, int skip, int take, SmartFilter? filter, int facilityId)
{
    var query = context.Appointments
        .Include(a => a.Service)
        .Include(a => a.Client)
        .Where(s => s.FacilityId == facilityId)
        .ApplySmartFilter(filter);

    if (direction == Direction.Forwards)
        query = query.Where(s => s.Date >= date).OrderBy(s => s.Date).ThenBy(s => s.Time).ThenBy(s => s.Duration);
    else
        query = query.Where(s => s.Date < date).OrderByDescending(s => s.Date).ThenByDescending(s => s.Time).ThenByDescending(s => s.Duration);

    var appointments = await query
        .Skip(skip)
        .Take(take)
        .ToListAsync();

    var previousById = await GetPreviousAppointments(appointments, facilityId);
    return appointments.Select(a => a.ToViewDTO(previousById.GetValueOrDefault(a.Id))).ToList();
}
```

- [ ] **Step 4: Run the tests to confirm they pass (GREEN)**

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests"`
Expected: all `GetList_*` and `GetAll_*` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add Appy/Services/AppointmentService.cs Appy.Tests/Services/AppointmentServiceTests.cs
git commit -m "fix(appointments): batch-load previous appointments in GetList to kill N+1 (#78)"
```

---

## Task 3: Docs and full verification

**Files:**
- Modify: `Appy.Tests/CLAUDE.md`

- [ ] **Step 1: Update the test-unit CLAUDE.md**

In `Appy.Tests/CLAUDE.md`, in the `AppointmentServiceTests` bullet (line 11), append a sentence:

```
Also verifies `GetAll`/`GetList` previous-appointment resolution (most-recent earlier appointment per client, same-day earlier-time, per-client isolation, null when none) and that previous-appointment loading is batched — the DbSet is queried a constant number of times regardless of result size (N+1 regression guard).
```

- [ ] **Step 2: Build the solution**

Run: `dotnet build`
Expected: `Build succeeded`, 0 errors.

- [ ] **Step 3: Run the full test suite**

Run: `dotnet test`
Expected: all tests PASS (existing AppointmentReminder / ClientNotification / AppointmentService tests plus the new ones).

- [ ] **Step 4: Commit**

```bash
git add Appy.Tests/CLAUDE.md
git commit -m "docs(tests): note batched previous-appointment coverage (#78)"
```

---

## Self-Review Notes

- **Spec coverage:** batched helper (Task 1 Step 4), GetAll rewrite (Task 1), GetList rewrite (Task 2), correctness-equivalence locked by characterization tests (Task 1 Step 2, Task 2 Step 1), N+1 proven by query-count guards (both tasks), docs (Task 3). Single-row `GetPreviousAppointment` intentionally untouched.
- **Signature consistency:** helper `GetPreviousAppointments(List<Appointment>, int) -> Task<Dictionary<int, AppointmentViewDTO?>>` is defined in Task 1 and called identically in both `GetAll` and `GetList`.
- **Note for executor:** `GetAll` and `GetList` change from expression-bodied `return ...ToListAsync()` to `async`/`await`. Both interface signatures already return `Task<List<AppointmentViewDTO>>`, so no interface change is needed. Callers `AddNew`/`Edit` (which call `GetAll(..., findPrevious: false, ...)`) are unaffected.
