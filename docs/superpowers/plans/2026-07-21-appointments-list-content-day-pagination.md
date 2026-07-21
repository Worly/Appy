# Content-Day Pagination for the Appointments List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redefine the appointments list-view page from "N appointments" (offset paging) to "K content-days" (date-cursor paging), so days with only a time-off render (#146) and inserting/removing an appointment no longer shifts page offsets (#142).

**Architecture:** A *content-day* is any day with ≥1 appointment or ≥1 time-off occurrence. `GET /appointment/getList` takes a **date cursor** + direction + `take` (K content-days) and returns the window's appointments, its time-off occurrences, and forward/backward continuation cursors. The backend finds the next K content-days via indexed appointment-date queries merged with rule-generated time-off dates. The frontend gets a new cursor-based paged builder (`pagedQueryByCursor`) producing the existing `PagedResult` contract, and the list component groups by content-day instead of appointment-day.

**Tech Stack:** ASP.NET Core 8 (xUnit + Moq + Moq.EntityFrameworkCore), Angular 16 (Karma/Jasmine), `@tanstack/query-core` 5.90, dayjs, PostgreSQL.

## Global Constraints

- **Page size K = 14 content-days.** Where a literal is needed, use `14` (backend `take` default is supplied by the caller; frontend passes `take: 14`).
- **Filter active ⇒ zero time-offs.** When `filter != null`, the backend returns `TimeOffs = []` and computes content-days from appointments only.
- **No forward bound.** Forward pagination continues while any content exists ahead (`NextCursor` non-null); backward pagination stops at the earliest content (`PrevCursor` null).
- **Wire order is always ascending.** Both forward and backward pages return items ascending by (date, time, duration).
- **Backend target .NET 8.0; frontend Angular 16 (Observable-flavoured contracts).**
- **Every changed unit's `CLAUDE.md` must be updated in the same task** (repo rule).
- **Never add Claude as a git co-author.** Commit messages carry no `Co-Authored-By` trailer.
- **`docs/superpowers/` is dropped from the branch before any PR** (do not include the spec/plan in a PR).
- **TDD:** write the failing test, watch it fail, implement minimally, watch it pass, commit.

---

## Task 1: Time-off occurrence-date generation (TimeOffService)

Adds the recurrence math needed to find the next/previous K time-off occurrence-dates from a cursor. Pure static helpers (unit-tested directly) plus two service methods that load candidate rules and merge.

**Files:**
- Modify: `Appy/Services/TimeOffService.cs` (add to `ITimeOffService` + `TimeOffService`)
- Test: `Appy.Tests/Services/TimeOffServiceTests.cs` (add cases)
- Modify: `Appy/Services/CLAUDE.md` (document new methods)

**Interfaces:**
- Produces (static, pure):
  - `IEnumerable<DateOnly> TimeOffService.OccurrenceDatesFrom(TimeOff t, DateOnly from, int count)` — up to `count` occurrence dates on/after `from`, ascending.
  - `DateOnly? TimeOffService.PreviousOccurrenceBefore(TimeOff t, DateOnly before)` — the latest occurrence strictly before `before`, or null.
  - `IEnumerable<DateOnly> TimeOffService.OccurrenceDatesBefore(TimeOff t, DateOnly before, int count)` — up to `count` occurrence dates strictly before `before`, descending.
- Produces (service, on `ITimeOffService`):
  - `Task<List<DateOnly>> GetOccurrenceDatesForward(DateOnly from, int count, int facilityId)` — the `count` nearest occurrence-dates on/after `from` across all rules, ascending.
  - `Task<List<DateOnly>> GetOccurrenceDatesBackward(DateOnly before, int count, int facilityId)` — the `count` nearest occurrence-dates strictly before `before`, ascending.
- Consumes: existing `TimeOffService.NextOccurrenceOnOrAfter(TimeOff, DateOnly)`.

- [ ] **Step 1: Write failing tests for the pure generators**

Add to `Appy.Tests/Services/TimeOffServiceTests.cs` (mirror the existing static-method test style — `NextOccurrenceOnOrAfter` tests already exist here):

```csharp
[Fact]
public void OccurrenceDatesFrom_OneOff_ReturnsEachDayInRange()
{
    var t = new TimeOff { Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 1, 10), EndDate = new DateOnly(2030, 1, 12) };
    var days = TimeOffService.OccurrenceDatesFrom(t, new DateOnly(2030, 1, 1), 10).ToList();
    Assert.Equal(new[] { new DateOnly(2030, 1, 10), new DateOnly(2030, 1, 11), new DateOnly(2030, 1, 12) }, days);
}

[Fact]
public void OccurrenceDatesFrom_Weekly_StepsBySevenDays_AndHonoursCount()
{
    var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, StartDate = new DateOnly(2030, 1, 1) };
    var days = TimeOffService.OccurrenceDatesFrom(t, new DateOnly(2030, 1, 1), 3).ToList();
    // 2030-01-07 is the first Monday on/after 2030-01-01
    Assert.Equal(new[] { new DateOnly(2030, 1, 7), new DateOnly(2030, 1, 14), new DateOnly(2030, 1, 21) }, days);
}

[Fact]
public void OccurrenceDatesFrom_Weekly_StopsAtEndDate()
{
    var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, StartDate = new DateOnly(2030, 1, 1), EndDate = new DateOnly(2030, 1, 15) };
    var days = TimeOffService.OccurrenceDatesFrom(t, new DateOnly(2030, 1, 1), 10).ToList();
    Assert.Equal(new[] { new DateOnly(2030, 1, 7), new DateOnly(2030, 1, 14) }, days);
}

[Fact]
public void OccurrenceDatesBefore_Weekly_ReturnsDescending()
{
    var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, StartDate = new DateOnly(2030, 1, 1) };
    var days = TimeOffService.OccurrenceDatesBefore(t, new DateOnly(2030, 1, 22), 2).ToList();
    Assert.Equal(new[] { new DateOnly(2030, 1, 21), new DateOnly(2030, 1, 14) }, days);
}

[Fact]
public void OccurrenceDatesBefore_OneOff_ExcludesTheBeforeDateItself()
{
    var t = new TimeOff { Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 1, 10), EndDate = new DateOnly(2030, 1, 12) };
    var days = TimeOffService.OccurrenceDatesBefore(t, new DateOnly(2030, 1, 12), 10).ToList();
    Assert.Equal(new[] { new DateOnly(2030, 1, 11), new DateOnly(2030, 1, 10) }, days);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.OccurrenceDates"`
Expected: FAIL — `OccurrenceDatesFrom` / `OccurrenceDatesBefore` do not exist (compile error).

- [ ] **Step 3: Implement the pure generators**

Add to `TimeOffService` (place near `NextOccurrenceOnOrAfter`, `Appy/Services/TimeOffService.cs`):

```csharp
// Up to `count` occurrence dates on/after `from`, ascending. Reuses NextOccurrenceOnOrAfter,
// advancing one day past each hit — so it works uniformly for one-off ranges, weekly and monthly.
public static IEnumerable<DateOnly> OccurrenceDatesFrom(TimeOff t, DateOnly from, int count)
{
    var cursor = from;
    for (var i = 0; i < count; i++)
    {
        var next = NextOccurrenceOnOrAfter(t, cursor);
        if (next == null)
            yield break;
        yield return next.Value;
        cursor = next.Value.AddDays(1);
    }
}

// The latest date strictly before `before` that this rule applies on, honouring its bounds.
public static DateOnly? PreviousOccurrenceBefore(TimeOff t, DateOnly before)
{
    var upper = before.AddDays(-1);
    if (t.EndDate.HasValue && t.EndDate.Value < upper)
        upper = t.EndDate.Value;
    if (upper < t.StartDate)
        return null;

    switch (t.Recurrence)
    {
        case TimeOffRecurrence.OneOff:
            if (t.EndDate == null) return null;
            return upper;   // one-off fires every day in [StartDate, EndDate]; `upper` is clamped into it

        case TimeOffRecurrence.Weekly:
            if (t.DayOfWeek == null) return null;
            var delta = ((int)upper.DayOfWeek - (int)t.DayOfWeek.Value + 7) % 7;
            var wd = upper.AddDays(-delta);
            return wd >= t.StartDate ? wd : (DateOnly?)null;

        case TimeOffRecurrence.Monthly:
            if (t.DayOfMonth == null) return null;
            for (var d = upper; d >= t.StartDate && d >= upper.AddDays(-366); d = d.AddDays(-1))
                if (d.Day == t.DayOfMonth.Value) return d;
            return null;

        default:
            return null;
    }
}

// Up to `count` occurrence dates strictly before `before`, descending.
public static IEnumerable<DateOnly> OccurrenceDatesBefore(TimeOff t, DateOnly before, int count)
{
    var cursor = before;
    for (var i = 0; i < count; i++)
    {
        var prev = PreviousOccurrenceBefore(t, cursor);
        if (prev == null)
            yield break;
        yield return prev.Value;
        cursor = prev.Value;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.OccurrenceDates"`
Expected: PASS (5 tests).

- [ ] **Step 5: Write failing tests for the merging service methods**

Add to `TimeOffServiceTests` (this class already builds a `TimeOffService` over a mocked `MainDbContext`; if it does not, mirror `AppointmentServiceTests`' `dbContextMock.Setup(x => x.TimeOffs).ReturnsDbSet(list)` pattern):

```csharp
[Fact]
public async Task GetOccurrenceDatesForward_MergesRules_AndReturnsNearestCount()
{
    var facilityId = 1;
    var weekly = new TimeOff { Id = 1, FacilityId = facilityId, Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, StartDate = new DateOnly(2030, 1, 1) };
    var oneOff = new TimeOff { Id = 2, FacilityId = facilityId, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 1, 9), EndDate = new DateOnly(2030, 1, 9) };
    var ctx = new Mock<MainDbContext>();
    ctx.Setup(x => x.TimeOffs).ReturnsDbSet(new List<TimeOff> { weekly, oneOff });
    var svc = new TimeOffService(ctx.Object, NullLogger<TimeOffService>.Instance);

    var days = await svc.GetOccurrenceDatesForward(new DateOnly(2030, 1, 1), 3, facilityId);

    // Mondays 7, 14, 21 merged with one-off 9 → nearest 3 = 7, 9, 14
    Assert.Equal(new[] { new DateOnly(2030, 1, 7), new DateOnly(2030, 1, 9), new DateOnly(2030, 1, 14) }, days);
}

[Fact]
public async Task GetOccurrenceDatesBackward_ReturnsNearestCountBelowCursor_Ascending()
{
    var facilityId = 1;
    var weekly = new TimeOff { Id = 1, FacilityId = facilityId, Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, StartDate = new DateOnly(2030, 1, 1) };
    var ctx = new Mock<MainDbContext>();
    ctx.Setup(x => x.TimeOffs).ReturnsDbSet(new List<TimeOff> { weekly });
    var svc = new TimeOffService(ctx.Object, NullLogger<TimeOffService>.Instance);

    var days = await svc.GetOccurrenceDatesBackward(new DateOnly(2030, 1, 22), 2, facilityId);

    Assert.Equal(new[] { new DateOnly(2030, 1, 14), new DateOnly(2030, 1, 21) }, days);
}
```

Add the required usings if missing: `using Moq;`, `using Moq.EntityFrameworkCore;`, `using Microsoft.Extensions.Logging.Abstractions;`.

- [ ] **Step 6: Run tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests.GetOccurrenceDates"`
Expected: FAIL — methods not defined.

- [ ] **Step 7: Implement the service methods**

Add to `ITimeOffService` (interface block near `GetOccurrencesForDates`):

```csharp
Task<List<DateOnly>> GetOccurrenceDatesForward(DateOnly from, int count, int facilityId);
Task<List<DateOnly>> GetOccurrenceDatesBackward(DateOnly before, int count, int facilityId);
```

Add to `TimeOffService`:

```csharp
// The `count` nearest time-off occurrence-dates on/after `from`, ascending. Pre-filters to rules
// whose effective span can still reach `from`, then merges per-rule generation.
public async Task<List<DateOnly>> GetOccurrenceDatesForward(DateOnly from, int count, int facilityId)
{
    var rules = await context.TimeOffs
        .Where(t => t.FacilityId == facilityId && (t.EndDate == null || t.EndDate >= from))
        .ToListAsync();

    var days = new SortedSet<DateOnly>();
    foreach (var r in rules)
        foreach (var d in OccurrenceDatesFrom(r, from, count))
            days.Add(d);

    return days.Take(count).ToList();
}

// The `count` nearest time-off occurrence-dates strictly before `before`, ascending.
public async Task<List<DateOnly>> GetOccurrenceDatesBackward(DateOnly before, int count, int facilityId)
{
    var rules = await context.TimeOffs
        .Where(t => t.FacilityId == facilityId && t.StartDate < before)
        .ToListAsync();

    var days = new SortedSet<DateOnly>();
    foreach (var r in rules)
        foreach (var d in OccurrenceDatesBefore(r, before, count))
            days.Add(d);

    var all = days.ToList();                              // ascending
    return all.Skip(Math.Max(0, all.Count - count)).ToList();   // the `count` largest, still ascending
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~TimeOffServiceTests"`
Expected: PASS (all existing + new).

- [ ] **Step 9: Update `Appy/Services/CLAUDE.md`**

In the `TimeOffService` row, append a sentence:

> `GetOccurrenceDatesForward(from, count)` / `GetOccurrenceDatesBackward(before, count)` return the nearest `count` occurrence-dates in each direction (built on the pure `OccurrenceDatesFrom` / `PreviousOccurrenceBefore` / `OccurrenceDatesBefore` generators, which reuse `NextOccurrenceOnOrAfter`), used by the appointment list to page by content-day.

- [ ] **Step 10: Commit**

```bash
git add Appy/Services/TimeOffService.cs Appy.Tests/Services/TimeOffServiceTests.cs Appy/Services/CLAUDE.md
git commit -m "feat: time-off occurrence-date generators for content-day paging (#146)"
```

---

## Task 2: Backend GetList content-day windowing

Rewrites `AppointmentService.GetList` to page by content-day from a date cursor. Changes the service signature (drops `skip`), adds `NextCursor`/`PrevCursor` to the envelope, updates the controller and the dashboard call-site. All must change together to compile.

**Files:**
- Modify: `Appy/DTOs/AppointmentListPageDTO.cs`
- Modify: `Appy/Services/AppointmentService.cs` (`IAppointmentService.GetList` + impl + 2 private helpers)
- Modify: `Appy/Controllers/AppointmentController.cs:47-55` (drop `skip` query param)
- Modify: `Appy/Controllers/DashboardController.cs:61` (drop `skip` arg)
- Test: `Appy.Tests/Services/AppointmentServiceTests.cs` (rewrite the 3 `GetList` tests, add new ones)
- Test: `Appy.Tests/Controllers/DashboardControllerTests.cs` (update the `GetList` mock setup)
- Modify: `Appy/DTOs/CLAUDE.md`, `Appy/Controllers/CLAUDE.md`, `Appy/Services/CLAUDE.md`

**Interfaces:**
- Consumes: `ITimeOffService.GetOccurrenceDatesForward/Backward` (Task 1), existing `GetOccurrencesForDates`.
- Produces: `Task<AppointmentListPageDTO> GetList(DateOnly cursor, Direction direction, int take, SmartFilter? filter, int facilityId)` and `AppointmentListPageDTO { List<AppointmentViewDTO> Appointments; List<TimeOffOccurrenceDTO> TimeOffs; DateOnly? NextCursor; DateOnly? PrevCursor; }`.

- [ ] **Step 1: Extend the DTO**

`Appy/DTOs/AppointmentListPageDTO.cs`:

```csharp
namespace Appy.DTOs
{
    public class AppointmentListPageDTO
    {
        public List<AppointmentViewDTO> Appointments { get; set; }
        public List<TimeOffOccurrenceDTO> TimeOffs { get; set; }

        // Cursor to fetch the next page forwards (Date >= NextCursor); null when no content is ahead.
        public DateOnly? NextCursor { get; set; }
        // Cursor to fetch the next page backwards (Date < PrevCursor); null when no content is behind.
        public DateOnly? PrevCursor { get; set; }
    }
}
```

- [ ] **Step 2: Write the failing tests (rewrite existing GetList tests to the new signature + add coverage)**

In `Appy.Tests/Services/AppointmentServiceTests.cs`, replace the three existing `GetList_*` tests with these (the new signature drops `skip`, so the old `GetList(date, dir, 0, 20, null, id)` calls no longer compile):

```csharp
[Fact]
public async Task GetList_IncludesTimeOffsForReturnedAppointments()
{
    var appointment = AddAppointmentOn(1, new DateOnly(2030, 1, 15));
    var occurrence = new TimeOffOccurrenceDTO { Id = 7, Date = appointment.Date, Label = "Closed" };
    timeOffServiceMock
        .Setup(x => x.GetOccurrencesForDates(It.Is<IEnumerable<DateOnly>>(d => d.Contains(appointment.Date)), FacilityId))
        .ReturnsAsync(new List<TimeOffOccurrenceDTO> { occurrence });

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, null, FacilityId);

    Assert.Single(result.Appointments);
    Assert.Single(result.TimeOffs);
    Assert.Equal(7, result.TimeOffs[0].Id);
}

[Fact]
public async Task GetList_RendersDayWithOnlyTimeOff_AndNoAppointment()
{
    // No appointments at all; a time-off falls on 2030-01-20.
    timeOffServiceMock
        .Setup(x => x.GetOccurrenceDatesForward(It.IsAny<DateOnly>(), It.IsAny<int>(), FacilityId))
        .ReturnsAsync(new List<DateOnly> { new DateOnly(2030, 1, 20) });
    timeOffServiceMock
        .Setup(x => x.GetOccurrencesForDates(It.Is<IEnumerable<DateOnly>>(d => d.Contains(new DateOnly(2030, 1, 20))), FacilityId))
        .ReturnsAsync(new List<TimeOffOccurrenceDTO> { new() { Id = 5, Date = new DateOnly(2030, 1, 20), Label = "Closed", IsAllDay = true } });

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, null, FacilityId);

    Assert.Empty(result.Appointments);
    Assert.Single(result.TimeOffs);
    Assert.Equal(new DateOnly(2030, 1, 20), result.TimeOffs[0].Date);
}

[Fact]
public async Task GetList_SuppressesTimeOffs_WhenFilterActive()
{
    AddAppointmentOn(1, new DateOnly(2030, 1, 15));
    // A filter is present → time-off collaborators must never be consulted.
    var filter = new SmartFilter();   // empty filter object is still "a filter is active"

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, filter, FacilityId);

    Assert.Empty(result.TimeOffs);
    timeOffServiceMock.Verify(x => x.GetOccurrenceDatesForward(It.IsAny<DateOnly>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    timeOffServiceMock.Verify(x => x.GetOccurrencesForDates(It.IsAny<IEnumerable<DateOnly>>(), It.IsAny<int>()), Times.Never);
}

[Fact]
public async Task GetList_SparseCalendar_ReturnsFarAppointment_InOnePage()
{
    AddAppointmentOn(1, new DateOnly(2030, 1, 15));
    AddAppointmentOn(2, new DateOnly(2040, 6, 1)); // ten years later

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, null, FacilityId);

    Assert.Equal(2, result.Appointments.Count);
    Assert.Contains(result.Appointments, a => a.Date == new DateOnly(2040, 6, 1));
}

[Fact]
public async Task GetList_SetsNextCursor_WhenMoreContentAhead()
{
    for (var i = 0; i < 20; i++)
        AddAppointmentOn(i + 1, new DateOnly(2030, 1, 1).AddDays(i)); // 20 distinct content-days

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, null, FacilityId);

    Assert.NotNull(result.NextCursor);                       // 20 days > take 14 ⇒ more ahead
    Assert.Equal(new DateOnly(2030, 1, 15), result.NextCursor); // day after the 14th content-day (Jan 14)
}

[Fact]
public async Task GetList_NextCursorNull_WhenNoMoreForward()
{
    AddAppointmentOn(1, new DateOnly(2030, 1, 15));

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, null, FacilityId);

    Assert.Null(result.NextCursor);
}

[Fact]
public async Task GetList_Backwards_ReturnsDaysBeforeCursor_Ascending()
{
    AddAppointmentOn(1, new DateOnly(2030, 1, 10));
    AddAppointmentOn(2, new DateOnly(2030, 1, 5));

    var result = await service.GetList(new DateOnly(2030, 1, 15), Direction.Backwards, 14, null, FacilityId);

    Assert.Equal(new[] { new DateOnly(2030, 1, 5), new DateOnly(2030, 1, 10) }, result.Appointments.Select(a => a.Date).ToArray());
    Assert.Null(result.PrevCursor); // nothing before Jan 5
}
```

Keep the existing `GetList_ReturnsEmptyTimeOffs_WhenNoAppointmentsOnPage` but update its call to the new signature:

```csharp
[Fact]
public async Task GetList_ReturnsEmptyTimeOffs_WhenNoAppointmentsOnPage()
{
    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 14, null, FacilityId);
    Assert.Empty(result.Appointments);
    Assert.Empty(result.TimeOffs);
}
```

The constructor's default mock for `GetOccurrenceDatesForward/Backward` should return empty so unrelated tests don't pull in time-off days — add to the test constructor (near the existing `GetOccurrencesForDates` setup):

```csharp
timeOffServiceMock
    .Setup(x => x.GetOccurrenceDatesForward(It.IsAny<DateOnly>(), It.IsAny<int>(), FacilityId))
    .ReturnsAsync(new List<DateOnly>());
timeOffServiceMock
    .Setup(x => x.GetOccurrenceDatesBackward(It.IsAny<DateOnly>(), It.IsAny<int>(), FacilityId))
    .ReturnsAsync(new List<DateOnly>());
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests.GetList"`
Expected: FAIL (compile error — `GetList` still has the old signature).

- [ ] **Step 4: Implement the new `GetList` + helpers**

In `Appy/Services/AppointmentService.cs`, change the interface line:

```csharp
Task<AppointmentListPageDTO> GetList(DateOnly cursor, Direction direction, int take, SmartFilter? filter, int facilityId);
```

Replace the whole `GetList` method body (currently lines 75-115) with:

```csharp
public async Task<AppointmentListPageDTO> GetList(DateOnly cursor, Direction direction, int take, SmartFilter? filter, int facilityId)
{
    var forwards = direction == Direction.Forwards;

    var appointmentQuery = context.Appointments
        .Where(a => a.FacilityId == facilityId)
        .ApplySmartFilter(filter);

    // Candidate appointment content-days in the requested direction.
    var appointmentDays = forwards
        ? await appointmentQuery.Where(a => a.Date >= cursor).Select(a => a.Date).Distinct().OrderBy(d => d).Take(take).ToListAsync()
        : await appointmentQuery.Where(a => a.Date < cursor).Select(a => a.Date).Distinct().OrderByDescending(d => d).Take(take).ToListAsync();

    // Candidate time-off content-days — never fetched when a filter is active.
    var timeOffDays = filter != null
        ? new List<DateOnly>()
        : forwards
            ? await timeOffService.GetOccurrenceDatesForward(cursor, take, facilityId)
            : await timeOffService.GetOccurrenceDatesBackward(cursor, take, facilityId);

    // The nearest `take` content-days overall (the first K of A ∪ B are within the first K of each),
    // then presented ascending — the wire order in both directions.
    var candidates = appointmentDays.Concat(timeOffDays).Distinct();
    var windowDays = (forwards ? candidates.OrderBy(d => d) : candidates.OrderByDescending(d => d))
        .Take(take)
        .OrderBy(d => d)
        .ToList();

    var appointments = new List<AppointmentViewDTO>();
    var timeOffs = new List<TimeOffOccurrenceDTO>();
    if (windowDays.Count > 0)
    {
        var min = windowDays[0];
        var max = windowDays[^1];
        appointments = await appointmentQuery
            .Where(a => a.Date >= min && a.Date <= max)
            .OrderBy(a => a.Date).ThenBy(a => a.Time).ThenBy(a => a.Duration)
            .Select(a => new
            {
                app = a,
                previous = context.Appointments
                    .Include(a => a.Service)
                    .Include(a => a.Client)
                    .Where(s => s.FacilityId == a.FacilityId && s.ClientId == a.ClientId && (s.Date < a.Date || (s.Date == a.Date && s.Time < a.Time)))
                    .OrderByDescending(s => s.Date)
                    .ThenByDescending(s => s.Time)
                    .ThenByDescending(s => s.Duration)
                    .Select(a => a.ToViewDTO(null))
                    .FirstOrDefault()
            })
            .Select(a => a.app.ToViewDTO(a.previous))
            .ToListAsync();

        if (filter == null)
            timeOffs = await timeOffService.GetOccurrencesForDates(windowDays, facilityId);
    }

    var prevBase = windowDays.Count > 0 ? windowDays[0] : cursor;
    DateOnly? prevCursor = await HasContentBefore(prevBase, facilityId, filter) ? prevBase : (DateOnly?)null;

    DateOnly? nextCursor = null;
    if (windowDays.Count > 0)
    {
        var afterWindow = windowDays[^1].AddDays(1);
        if (await HasContentOnOrAfter(afterWindow, facilityId, filter))
            nextCursor = afterWindow;
    }

    return new AppointmentListPageDTO
    {
        Appointments = appointments,
        TimeOffs = timeOffs,
        NextCursor = nextCursor,
        PrevCursor = prevCursor,
    };
}

private async Task<bool> HasContentOnOrAfter(DateOnly date, int facilityId, SmartFilter? filter)
{
    if (await context.Appointments.Where(a => a.FacilityId == facilityId).ApplySmartFilter(filter).AnyAsync(a => a.Date >= date))
        return true;
    if (filter == null && (await timeOffService.GetOccurrenceDatesForward(date, 1, facilityId)).Count > 0)
        return true;
    return false;
}

private async Task<bool> HasContentBefore(DateOnly date, int facilityId, SmartFilter? filter)
{
    if (await context.Appointments.Where(a => a.FacilityId == facilityId).ApplySmartFilter(filter).AnyAsync(a => a.Date < date))
        return true;
    if (filter == null && (await timeOffService.GetOccurrenceDatesBackward(date, 1, facilityId)).Count > 0)
        return true;
    return false;
}
```

- [ ] **Step 5: Update the controller**

`Appy/Controllers/AppointmentController.cs` — the `GetList` action (lines 47-55). Drop the `skip` query param and rename `date` → `cursor` in the call:

```csharp
[HttpGet("getList")]
[Authorize]
public async Task<ActionResult<AppointmentListPageDTO>> GetList(
    [FromQuery] DateOnly date, [FromQuery] Direction direction, [FromQuery] int take, [FromQuery] SmartFilter? filter)
{
    var result = await this.appointmentService.GetList(date, direction, take, filter, HttpContext.SelectedFacility());

    return Ok(result);
}
```

(The query param stays named `date` — it *is* the cursor from the frontend's perspective; the service parameter is named `cursor`.)

- [ ] **Step 6: Update the dashboard call-site**

`Appy/Controllers/DashboardController.cs:61` — drop the `0` skip argument:

```csharp
var page = await appointmentService.GetList(DateOnly.FromDateTime(DateTime.UtcNow), Direction.Forwards, 100, filter, HttpContext.SelectedFacility());
```

Then open `Appy.Tests/Controllers/DashboardControllerTests.cs` and update the `IAppointmentService.GetList` mock `Setup(...)` to the new 5-argument signature — remove the `skip` argument matcher (e.g. change `GetList(It.IsAny<DateOnly>(), It.IsAny<Direction>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<SmartFilter>(), It.IsAny<int>())` to drop one `It.IsAny<int>()`). The dashboard now asks for 100 *content-days* of unconfirmed appointments rather than 100 appointment rows; because it passes a filter, time-offs are already suppressed, so `UpcomingUnconfirmed` behaviour is unchanged in practice.

- [ ] **Step 7: Build and run the backend tests**

Run: `dotnet build`
Expected: builds with no errors.

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests"` then `dotnet test --filter "FullyQualifiedName~DashboardControllerTests"`
Expected: PASS.

- [ ] **Step 8: Update backend CLAUDE.md files**

- `Appy/DTOs/CLAUDE.md` → `AppointmentListPageDTO` section: note it now also carries `NextCursor` / `PrevCursor` (nullable dates; the cursors that continue the list forwards/backwards, null at the ends), and that `TimeOffs` now covers every content-day in the window (not only appointment days) and is empty when a filter is active.
- `Appy/Controllers/CLAUDE.md` → Appointment-Specific Notes: `getList` now takes `date` (a **date cursor**), `direction`, `take` (content-days per page) — no `skip`; returns the window's appointments + time-offs plus `NextCursor`/`PrevCursor`.
- `Appy/Services/CLAUDE.md` → `AppointmentService` row: `GetList` pages by **content-day** (union of appointment days and time-off occurrence days) from a date cursor; time-offs suppressed when a filter is active; forward-unbounded, backward-bounded.

- [ ] **Step 9: Commit**

```bash
git add Appy/DTOs/AppointmentListPageDTO.cs Appy/Services/AppointmentService.cs Appy/Controllers/AppointmentController.cs Appy/Controllers/DashboardController.cs Appy.Tests/Services/AppointmentServiceTests.cs Appy.Tests/Controllers/DashboardControllerTests.cs Appy/DTOs/CLAUDE.md Appy/Controllers/CLAUDE.md Appy/Services/CLAUDE.md
git commit -m "feat: content-day windowing for appointment getList (#146, #142)"
```

---

## Task 3: `pagedQueryByCursor` frontend builder

A cursor-based sibling to `pagedQuery`, producing the same `PagedResult<T, E>`. Pages are always ascending (no reversal); TanStack chains via each page's `nextCursor`/`prevCursor`. The bidirectional-refetch test is the load-bearing gate.

**Files:**
- Create: `Appy/Appy-frontend/src/app/shared/services/data/paged-query-by-cursor.ts`
- Test: `Appy/Appy-frontend/src/app/shared/services/data/paged-query-by-cursor.spec.ts`
- Modify: `Appy/Appy-frontend/src/app/shared/CLAUDE.md`

**Interfaces:**
- Consumes: `@tanstack/query-core` `InfiniteQueryObserver`, `PagedResult`/`PageDirection` from `./contracts`, `CacheKey` from `./cache-coordinator`.
- Produces:
  - `interface CursorPage<T, E> { items: T[]; extra: E[]; nextCursor: string | null; prevCursor: string | null; }`
  - `interface PagedQueryByCursorOptions<T, E> { queryKey: CacheKey; anchor: string; loadPage: (dir: PageDirection, cursor: string) => Observable<CursorPage<T, E>>; }`
  - `function pagedQueryByCursor<T, E = never>(client: QueryClient, opts: PagedQueryByCursorOptions<T, E>): PagedResult<T, E>`

- [ ] **Step 1: Write the failing spec**

Create `Appy/Appy-frontend/src/app/shared/services/data/paged-query-by-cursor.spec.ts`:

```typescript
import { QueryClient } from "@tanstack/query-core";
import { of } from "rxjs";
import { CursorPage, pagedQueryByCursor } from "./paged-query-by-cursor";
import { PageDirection } from "./contracts";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const lastEmission = <T>(e: T[][]): T[] => e[e.length - 1];

/**
 * A loadPage over a fixed ascending set of content-days (numbers). Forwards = the first `take`
 * days >= cursor; backwards = the last `take` days < cursor (ascending). Cursors are stringified
 * day numbers. Mirrors the real backend contract closely enough to exercise the builder.
 */
function dataset(days: number[], take: number) {
    return (dir: PageDirection, cursor: string) => {
        const c = parseInt(cursor, 10);
        const window = dir === "forwards"
            ? days.filter(d => d >= c).slice(0, take)
            : days.filter(d => d < c).slice(-take);
        const nextCursor = window.length > 0 && days.some(d => d > window[window.length - 1])
            ? String(window[window.length - 1] + 1) : null;
        const prevBase = window.length > 0 ? window[0] : c;
        const prevCursor = days.some(d => d < prevBase) ? String(prevBase) : null;
        return of<CursorPage<number, never>>({ items: window, extra: [], nextCursor, prevCursor });
    };
}

describe("pagedQueryByCursor()", () => {
    it("loads the first forwards page from the anchor", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 1], anchor: "10", loadPage: dataset([10, 11, 12, 13], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11]);
    });

    it("appends the next page on loadMore('forwards')", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 2], anchor: "10", loadPage: dataset([10, 11, 12, 13], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
    });

    it("prepends earlier days on loadMore('backwards'), kept ascending", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 3], anchor: "10", loadPage: dataset([6, 7, 8, 9, 10, 11], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([6, 7, 8, 9, 10, 11]);
    });

    it("reports hasMore('forwards') false once nextCursor is null", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 4], anchor: "10", loadPage: dataset([10, 11, 12], 2) });
        pq.items$.subscribe();
        await flush();
        expect(pq.hasMore("forwards")).toBe(true);
        pq.loadMore("forwards");
        await flush();
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("stops backwards at the earliest content (prevCursor null)", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 5], anchor: "10", loadPage: dataset([9, 10, 11], 2) });
        pq.items$.subscribe();
        await flush();
        expect(pq.hasMore("backwards")).toBe(true);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission([[]]) !== undefined).toBe(true);
        expect(pq.hasMore("backwards")).toBe(false);
    });

    it("preserves anchor + backwards pages when the bidirectional list is refetched", async () => {
        // The load-bearing test: on refetch TanStack walks the whole page chain forward via
        // getNextPageParam starting from the first (most-backward) page. Because pages are ascending
        // and each carries nextCursor = day-after-its-max, re-fetching a backwards page forwards yields
        // the same days, so the anchor slot must survive.
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", "refetch"], anchor: "10", loadPage: dataset([8, 9, 10, 11], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);
        pq.refetch();
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]); // anchor [10, 11] survived
    });

    it("accumulates per-page extras in display order via extras$", async () => {
        const loadPage = (dir: PageDirection, cursor: string) => {
            const days = [8, 9, 10, 11];
            const c = parseInt(cursor, 10);
            const window = dir === "forwards" ? days.filter(d => d >= c).slice(0, 2) : days.filter(d => d < c).slice(-2);
            const nextCursor = window.length && days.some(d => d > window[window.length - 1]) ? String(window[window.length - 1] + 1) : null;
            const prevBase = window.length ? window[0] : c;
            const prevCursor = days.some(d => d < prevBase) ? String(prevBase) : null;
            return of<CursorPage<number, string>>({ items: window, extra: window.map(n => `e${n}`), nextCursor, prevCursor });
        };
        const pq = pagedQueryByCursor<number, string>(newClient(), { queryKey: ["c", "extras"], anchor: "10", loadPage });
        const extras: string[][] = [];
        pq.extras$.subscribe(e => extras.push(e));
        pq.items$.subscribe();
        await flush();
        expect(lastEmission(extras)).toEqual(["e10", "e11"]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(extras)).toEqual(["e8", "e9", "e10", "e11"]);
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/paged-query-by-cursor.spec.ts'`
Expected: FAIL — `./paged-query-by-cursor` module not found.

- [ ] **Step 3: Implement the builder**

Create `Appy/Appy-frontend/src/app/shared/services/data/paged-query-by-cursor.ts`:

```typescript
import { InfiniteData, InfiniteQueryObserver, InfiniteQueryObserverResult, QueryClient } from "@tanstack/query-core";
import { Observable, distinctUntilChanged, firstValueFrom, map, shareReplay } from "rxjs";
import { CacheKey } from "./cache-coordinator";
import { PageDirection, PagedResult } from "./contracts";

interface CursorPageParam {
    dir: PageDirection;
    cursor: string;
}

/** One raw page: ascending `items`, optional `extra` sidecar, and the cursors that continue the list. */
export interface CursorPage<T, E> {
    items: T[];
    extra: E[];
    /** Fetch the next forwards page from here (Date >= nextCursor); null when nothing is ahead. */
    nextCursor: string | null;
    /** Fetch the next backwards page from here (Date < prevCursor); null when nothing is behind. */
    prevCursor: string | null;
}

export interface PagedQueryByCursorOptions<T, E> {
    /** TanStack cache key (include the params/filter that scope this list). */
    queryKey: CacheKey;
    /** Cursor for the first (forwards) page — the anchor date, "YYYY-MM-DD". */
    anchor: string;
    /** Fetch one page. Every page comes back ascending; direction only picks which days. */
    loadPage: (dir: PageDirection, cursor: string) => Observable<CursorPage<T, E>>;
}

/**
 * Builds a {@link PagedResult} backed by a cursor-paginated TanStack {@link InfiniteQueryObserver}.
 *
 * Every page is ascending, so `data.pages` concatenates directly — no per-page reversal. Forward
 * pagination (and TanStack's refetch reconstruction, which walks the whole chain forward via
 * getNextPageParam from the first page) always continues as a forwards fetch from the last page's
 * `nextCursor`; a backwards page's days are ascending too, so re-fetching it forwards yields the same
 * days. Backward pagination continues from the first page's `prevCursor`. Ordering/filtering are the
 * backend's job. The observer is lazily created on first subscription and destroyed on the last leave.
 */
export function pagedQueryByCursor<T, E = never>(client: QueryClient, opts: PagedQueryByCursorOptions<T, E>): PagedResult<T, E> {
    const flatten = <V>(pages: CursorPage<T, E>[] | undefined, pick: (p: CursorPage<T, E>) => V[]): V[] => {
        const data: V[] = [];
        if (pages == null)
            return data;
        for (const p of pages)
            data.push(...pick(p));
        return data;
    };

    type Result = InfiniteQueryObserverResult<InfiniteData<CursorPage<T, E>, CursorPageParam>, unknown>;
    let observer: InfiniteQueryObserver<CursorPage<T, E>, unknown, InfiniteData<CursorPage<T, E>, CursorPageParam>, unknown[], CursorPageParam> | null = null;
    let latest: Result | null = null;

    const result$ = new Observable<Result>(sub => {
        const o = new InfiniteQueryObserver<CursorPage<T, E>, unknown, InfiniteData<CursorPage<T, E>, CursorPageParam>, unknown[], CursorPageParam>(client, {
            queryKey: opts.queryKey as unknown[],
            queryFn: ({ pageParam }) => firstValueFrom(opts.loadPage(pageParam.dir, pageParam.cursor)),
            initialPageParam: { dir: "forwards", cursor: opts.anchor },
            getNextPageParam: lastPage => lastPage.nextCursor == null ? undefined : { dir: "forwards", cursor: lastPage.nextCursor },
            getPreviousPageParam: firstPage => firstPage.prevCursor == null ? undefined : { dir: "backwards", cursor: firstPage.prevCursor },
        });
        observer = o;
        latest = o.getCurrentResult();
        sub.next(latest);
        const unsubscribe = o.subscribe(r => { latest = r; sub.next(r); });
        return () => {
            unsubscribe();
            o.destroy();
            if (observer === o) {
                observer = null;
                latest = null;
            }
        };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    const view$ = result$.pipe(
        map(r => ({
            items: flatten(r.data?.pages, p => p.items),
            extras: flatten(r.data?.pages, p => p.extra),
            error: r.error,
            loading: r.isPending,
            loadingForwards: r.isFetchingNextPage || (r.isFetching && r.isPending),
            loadingBackwards: r.isFetchingPreviousPage,
        })),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    return {
        items$: view$.pipe(map(v => v.items)),
        extras$: view$.pipe(map(v => v.extras)),
        page$: view$.pipe(map(v => ({ items: v.items, extras: v.extras }))),
        loading$: view$.pipe(map(v => v.loading), distinctUntilChanged()),
        loadingForwards$: view$.pipe(map(v => v.loadingForwards), distinctUntilChanged()),
        loadingBackwards$: view$.pipe(map(v => v.loadingBackwards), distinctUntilChanged()),
        error$: view$.pipe(map(v => v.error), distinctUntilChanged()),
        loadMore: (dir: PageDirection) => {
            if (!observer)
                return;
            const r = observer.getCurrentResult();
            if (r.isPending)
                return;
            // Wait out a full refetch (refetchOnMount / invalidation) — a directional fetch would cancel
            // it (cancelRefetch defaults true) and commit a stale snapshot.
            if (r.isFetching && !r.isFetchingNextPage && !r.isFetchingPreviousPage)
                return;
            if (dir === "forwards") {
                if (r.isFetchingNextPage || !r.hasNextPage)
                    return;
                observer.fetchNextPage();
            } else {
                if (r.isFetchingPreviousPage || !r.hasPreviousPage)
                    return;
                observer.fetchPreviousPage();
            }
        },
        hasMore: (dir: PageDirection) => dir === "forwards" ? (latest?.hasNextPage ?? false) : (latest?.hasPreviousPage ?? false),
        refetch: () => { observer?.refetch(); },
    };
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/paged-query-by-cursor.spec.ts'`
Expected: PASS. If the bidirectional-refetch test fails, do NOT proceed — the cursor chain is wrong; verify `getNextPageParam` always returns `dir: "forwards"` and that the dataset's `nextCursor` for a backwards page points at day-after-its-max.

- [ ] **Step 5: Update `Appy/Appy-frontend/src/app/shared/CLAUDE.md`**

In the Data Seam section, after the `pagedQuery` bullet, add:

> - **`pagedQueryByCursor(client, opts)`** (`paged-query-by-cursor.ts`): a cursor-paginated sibling of `pagedQuery` used by the appointments list. `loadPage(dir, cursor)` returns `CursorPage<T,E>` (`{ items, extra, nextCursor, prevCursor }`); pages are always ascending (no reversal), chained via `nextCursor`/`prevCursor`. Same `PagedResult` contract. Stable against inserts/removes because the page boundary is a date, not an offset. The other paged lists (time-off, holidays) remain on `pagedQuery`.

- [ ] **Step 6: Commit**

```bash
git add Appy/Appy-frontend/src/app/shared/services/data/paged-query-by-cursor.ts Appy/Appy-frontend/src/app/shared/services/data/paged-query-by-cursor.spec.ts Appy/Appy-frontend/src/app/shared/CLAUDE.md
git commit -m "feat: pagedQueryByCursor seam builder for cursor pagination (#142)"
```

---

## Task 4: `groupByContentDay` list-timeline helper

The pure function that makes the list render time-off-only days: group appointments by day, and add an appointment-less day for any date carrying a time-off occurrence.

**Files:**
- Modify: `Appy/Appy-frontend/src/app/utils/list-timeline.ts`
- Test: `Appy/Appy-frontend/src/app/utils/list-timeline.spec.ts` (create if absent)
- Modify: `Appy/Appy-frontend/src/app/utils/CLAUDE.md`

**Interfaces:**
- Produces: `interface ContentDay { date: Dayjs; appointments: AppointmentView[]; }` and `function groupByContentDay(appointments: AppointmentView[], timeOffs: TimeOffOccurrence[]): ContentDay[]` (ascending by date).
- Consumes: `AppointmentView`, `TimeOffOccurrence`, dayjs.

- [ ] **Step 1: Write the failing spec**

Create/append `Appy/Appy-frontend/src/app/utils/list-timeline.spec.ts`:

```typescript
import dayjs from "dayjs";
import { AppointmentView } from "../models/appointment";
import { TimeOffOccurrence } from "../models/time-off-occurrence";
import { groupByContentDay } from "./list-timeline";

function appointmentOn(dateISO: string): AppointmentView {
    const a = new AppointmentView();
    a.date = dayjs(dateISO);
    return a;
}
function occurrenceOn(dateISO: string): TimeOffOccurrence {
    return new TimeOffOccurrence({ id: 1, date: dateISO, isAllDay: true });
}

describe("groupByContentDay()", () => {
    it("groups appointments by day, ascending", () => {
        const days = groupByContentDay([appointmentOn("2030-01-15"), appointmentOn("2030-01-10"), appointmentOn("2030-01-15")], []);
        expect(days.map(d => d.date.format("YYYY-MM-DD"))).toEqual(["2030-01-10", "2030-01-15"]);
        expect(days[1].appointments.length).toBe(2);
    });

    it("adds an appointment-less day for a date that only has a time-off", () => {
        const days = groupByContentDay([appointmentOn("2030-01-15")], [occurrenceOn("2030-01-20")]);
        expect(days.map(d => d.date.format("YYYY-MM-DD"))).toEqual(["2030-01-15", "2030-01-20"]);
        const timeOffOnly = days.find(d => d.date.format("YYYY-MM-DD") === "2030-01-20")!;
        expect(timeOffOnly.appointments.length).toBe(0);
    });

    it("does not duplicate a day that has both an appointment and a time-off", () => {
        const days = groupByContentDay([appointmentOn("2030-01-20")], [occurrenceOn("2030-01-20")]);
        expect(days.length).toBe(1);
        expect(days[0].appointments.length).toBe(1);
    });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/list-timeline.spec.ts'`
Expected: FAIL — `groupByContentDay` not exported.

- [ ] **Step 3: Implement the helper**

Append to `Appy/Appy-frontend/src/app/utils/list-timeline.ts`:

```typescript
export interface ContentDay {
  date: Dayjs;
  appointments: AppointmentView[];
}

// Group appointments by day, then add an appointment-less day for any date that has a time-off
// occurrence but no appointment — so the list renders time-off-only days too. Ascending by date.
export function groupByContentDay(appointments: AppointmentView[], timeOffs: TimeOffOccurrence[]): ContentDay[] {
  const byKey = new Map<string, ContentDay>();
  const keyOf = (d: Dayjs) => d.format("YYYY-MM-DD");

  for (const a of appointments) {
    if (a.date == null) continue;
    const k = keyOf(a.date);
    if (!byKey.has(k)) byKey.set(k, { date: a.date, appointments: [] });
    byKey.get(k)!.appointments.push(a);
  }

  for (const o of timeOffs) {
    if (o.date == null) continue;
    const k = keyOf(o.date);
    if (!byKey.has(k)) byKey.set(k, { date: o.date, appointments: [] });
  }

  return [...byKey.values()].sort((x, y) => x.date.valueOf() - y.date.valueOf());
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/list-timeline.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Update `Appy/Appy-frontend/src/app/utils/CLAUDE.md`**

In the `list-timeline.ts` row, append: `groupByContentDay()` — group appointments by day plus a day for each time-off-only date (used by the list view to render days that have only a time-off).

- [ ] **Step 6: Commit**

```bash
git add Appy/Appy-frontend/src/app/utils/list-timeline.ts Appy/Appy-frontend/src/app/utils/list-timeline.spec.ts Appy/Appy-frontend/src/app/utils/CLAUDE.md
git commit -m "feat: groupByContentDay helper for time-off-only days (#146)"
```

---

## Task 5: Wire the appointments list to cursor pagination + content-day grouping

Integration: the frontend model gains cursor fields, `AppointmentService.getList` switches to `pagedQueryByCursor`, and `AppointmentsListComponent.renderAppointments` groups by content-day. Validated by build + the unit tests from Tasks 3–4 + manual/Cypress in Task 6.

**Files:**
- Modify: `Appy/Appy-frontend/src/app/models/appointment.ts:63-66` (`AppointmentListPageDTO`)
- Modify: `Appy/Appy-frontend/src/app/pages/appointments/services/appointment.service.ts:36-47` (`getList`)
- Modify: `Appy/Appy-frontend/src/app/pages/appointments/components/appointments-list/appointments-list.component.ts` (`renderAppointments` day loop)
- Modify: `Appy/Appy-frontend/src/app/pages/appointments/CLAUDE.md`

**Interfaces:**
- Consumes: `pagedQueryByCursor`, `CursorPage` (Task 3); `groupByContentDay`, `ContentDay` (Task 4).

- [ ] **Step 1: Add cursor fields to the frontend DTO**

`Appy/Appy-frontend/src/app/models/appointment.ts` (the `AppointmentListPageDTO` interface, lines 63-66):

```typescript
export interface AppointmentListPageDTO {
    appointments: AppointmentViewDTO[];
    timeOffs: TimeOffOccurrenceDTO[];
    nextCursor?: string;
    prevCursor?: string;
}
```

- [ ] **Step 2: Repoint `AppointmentService.getList` at the cursor builder**

`Appy/Appy-frontend/src/app/pages/appointments/services/appointment.service.ts` — replace `getList` (lines 36-47) with:

```typescript
public getList(date: Dayjs, filter: SmartFilter | undefined): PagedResult<AppointmentView, TimeOffOccurrence> {
    const anchor = date.format("YYYY-MM-DD");
    // Filter is part of the cache key so different filters cache as separate lists.
    const queryKey = [...appointmentKeys.list(anchor), filter ? JSON.stringify(filter) : "all"];

    const loadPage = (dir: PageDirection, cursor: string): Observable<CursorPage<AppointmentView, TimeOffOccurrence>> => {
        const params: any = { date: cursor, direction: dir, take: 14 };
        if (filter != null)
            params.filter = JSON.stringify(filter);

        return this.httpClient.get<AppointmentListPageDTO>(`${appConfig.apiUrl}${this.controllerName}/getList`, { params }).pipe(
            map(raw => ({
                items: raw.appointments.map(a => new AppointmentView(a)),
                extra: raw.timeOffs.map(o => new TimeOffOccurrence(o)),
                nextCursor: raw.nextCursor ?? null,
                prevCursor: raw.prevCursor ?? null,
            })));
    };

    return pagedQueryByCursor<AppointmentView, TimeOffOccurrence>(this.queryClient, { queryKey, anchor, loadPage });
}
```

Update the imports at the top of the file:

```typescript
import { PageDirection, PagedResult, QueryResult } from "src/app/shared/services/data/contracts";
import { CursorPage, pagedQueryByCursor } from "src/app/shared/services/data/paged-query-by-cursor";
```

(`getListAdvanced` is no longer used here; leave `BaseModelService` untouched — the time-off and holiday lists still use it.)

- [ ] **Step 3: Group by content-day in `renderAppointments`**

`Appy/Appy-frontend/src/app/pages/appointments/components/appointments-list/appointments-list.component.ts`. Add the import:

```typescript
import { buildDayTimeline, groupByContentDay, TimelineEntry } from 'src/app/utils/list-timeline';
```

In `renderAppointments`, replace the appointment-only grouping block (the `let sorted = ...` through the `for (let ap of sorted) {...}` loop that builds `dayKeys`/`byDate`, around lines 294-308) with content-day grouping:

```typescript
    // Content-day grouping: a divider is emitted for every day that has an appointment OR a
    // time-off occurrence, so days with only a time-off render too (#146).
    let days = groupByContentDay(this.appointments, this.timeOffs);
```

Then rewrite the day loop to iterate `days` instead of `dayKeys`/`byDate`. The loop body is unchanged except for how the current day and "is last" are read:

```typescript
    let startInserted = false;
    let prevDate: Dayjs | null = null;

    for (let k = 0; k < days.length; k++) {
      let day = days[k];

      // Insert the empty start-date divider when crossing over startDate between two days.
      if (!startInserted && prevDate?.isBefore(this.startDate, "date") && day.date.isAfter(this.startDate, "date")) {
        this.renderedItems.push(startDateItem);
        startInserted = true;
      }

      let dayOccurrences = this.timeOffs.filter(o => o.date?.isSame(day.date, "date"));
      let allDayOccurrences = dayOccurrences.filter(o => o.isAllDay);
      let isOnDayOff = allDayOccurrences.length > 0;

      this.renderedItems.push({
        type: "date",
        date: day.date,
        dateFormatted: day.date.format("DD.MM.YYYY - dddd"),
        dateISO: day.date.format("YYYY-MM-DD"),
        isEmptyDate: false,
        allDayOccurrences,
      });

      let timeline = buildDayTimeline(day.appointments, dayOccurrences);
      let prevEntry: TimelineEntry | null = null;
      let prevRenderedCardItem: RenderedCardItem | null = null;

      for (let i = 0; i < timeline.length; i++) {
        let entry = timeline[i];

        let isOverlappingWithPrev = false;
        if (prevEntry != null) {
          let ms = timeBetweenMs(prevEntry.start, prevEntry.duration, entry.start, entry.duration);
          if (ms !== 0) {
            isOverlappingWithPrev = ms < 0;
            this.renderedItems.push({ type: "gap", duration: dayjs.duration(Math.abs(ms)), isOverlap: isOverlappingWithPrev });
            if (isOverlappingWithPrev && prevRenderedCardItem != null)
              prevRenderedCardItem.isOverlapping = true;
          }
        }

        if (entry.kind === "appointment") {
          let item: RenderedAppointment = {
            type: "appointment",
            id: entry.appointment.id,
            appointment: entry.appointment,
            dateISO: day.date.format("YYYY-MM-DD"),
            isLast: k === days.length - 1 && i === timeline.length - 1,
            isOverlapping: isOverlappingWithPrev || isOnDayOff,
          };
          this.renderedItems.push(item);
          prevRenderedCardItem = item;
        }
        else if (entry.kind == "timeoff") {
          let item: RenderedTimeOff = {
            type: "timeoff",
            occurrence: entry.occurrence,
            isOverlapping: isOverlappingWithPrev
          };
          this.renderedItems.push(item);
          prevRenderedCardItem = item;
        }

        prevEntry = entry;
      }

      prevDate = day.date;
    }

    // Empty / boundary start-date divider.
    if (!startInserted) {
      if (days.length === 0 || days[0].date.isAfter(this.startDate, "date"))
        this.renderedItems.splice(0, 0, startDateItem);
      else if (days[days.length - 1].date.isBefore(this.startDate, "date"))
        this.renderedItems.splice(this.renderedItems.length, 0, startDateItem);
    }
```

Note: the `let sorted = this.appointments.sort(appointmentSort);` line is removed — `groupByContentDay` receives `this.appointments` directly and `buildDayTimeline` sorts each day's entries. The `appointmentSort` function is now unused; delete it (bottom of the file) to avoid a dead-code lint error, or leave it if other code references it (check with a find-references first).

- [ ] **Step 4: Build the frontend**

Run: `npx ng build`
Expected: builds with no TypeScript errors. If `appointmentSort` is reported unused, delete it.

- [ ] **Step 5: Run the full frontend unit suite**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS (existing + Task 3 + Task 4 specs).

- [ ] **Step 6: Update `Appy/Appy-frontend/src/app/pages/appointments/CLAUDE.md`**

In the **List view** paragraph and the `AppointmentsListComponent` bullet, update the description: the list is now **content-day paged** (`pagedQueryByCursor` via `AppointmentService.getList`), so a date divider is emitted for every day with an appointment **or** a time-off occurrence — days with only a time-off render too (via `groupByContentDay`). Pagination is by date cursor (`nextCursor`/`prevCursor`), not offset; when a filter is active the backend returns no time-offs, so time-off-only days appear only in the unfiltered list.

- [ ] **Step 7: Commit**

```bash
git add Appy/Appy-frontend/src/app/models/appointment.ts Appy/Appy-frontend/src/app/pages/appointments/services/appointment.service.ts Appy/Appy-frontend/src/app/pages/appointments/components/appointments-list/appointments-list.component.ts Appy/Appy-frontend/src/app/pages/appointments/CLAUDE.md
git commit -m "feat: appointments list renders time-off-only days via cursor paging (#146, #142)"
```

---

## Task 6: Full verification (unit + E2E + manual)

The integration gate. No new code unless a failure surfaces one.

**Files:** none (verification only); if adding the optional E2E test, `Appy/Appy-frontend/cypress/e2e/time-off.cy.ts` (+ possibly its page objects).

- [ ] **Step 1: Backend — full unit suite**

Run: `dotnet test`
Expected: PASS. Investigate any failure before proceeding.

- [ ] **Step 2: Frontend — full unit suite**

Run (from `Appy/Appy-frontend/`): `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 3: E2E — run the existing Cypress suite (regression gate for the changed list view)**

Ensure the backend (`dotnet run --project Appy`) and frontend (`npx ng serve`) are running, then from `Appy/Appy-frontend/` run with `run_in_background: true` (takes 2-6 minutes):

Run: `npx cypress run`
Expected: PASS — `appointments.cy.ts` (list add/edit/scroll, filters) and `time-off.cy.ts` (all-day badge in the list) exercise the rewritten list view.

- [ ] **Step 4: Optional new E2E — time-off-only day shows in the list**

Read `cypress/e2e/pages/appointments.ts` and `cypress/e2e/time-off.ts` first (the page-object APIs live there). Add a test to `time-off.cy.ts` that: creates an all-day one-off time-off on a date with no seeded appointment, opens the appointments list, scrolls/jumps to that date, and asserts the date divider with the all-day badge renders even though there is no appointment that day. Use the existing `appointments` and `time-off` page objects (extend them with a reader for a time-off-only divider if none exists). If the page objects can't express the assertion cleanly, cover it via Step 5 (manual) instead of forcing a brittle test.

- [ ] **Step 5: Manual validation via Playwright MCP**

With backend + frontend running, drive the browser (Playwright MCP): create an all-day time-off and a partial time-off on days with no appointments, open the appointments list, and confirm both render (all-day as a divider badge, partial as an inline row) with correct relative-date labels. Scroll backwards past the anchor and confirm past time-off-only days render. Apply a client filter and confirm time-off-only days disappear. Screenshot the time-off-only day for the record.

- [ ] **Step 6: Final commit (if Step 4 added a test) and summary**

```bash
git add Appy/Appy-frontend/cypress/
git commit -m "test: e2e for time-off-only day in the appointments list (#146)"
```

Report: all unit suites green, Cypress green, manual validation confirms time-off-only days render (unfiltered) and are suppressed under a filter.

---

## Self-Review

**Spec coverage:**
- Content-day paging (K=14) → Tasks 2 (backend windowing) + 3 (cursor builder) + 5 (wiring). ✓
- Time-off-only days render → Task 4 (`groupByContentDay`) + Task 5 (component). ✓
- Date-cursor stability (#142) → Task 2 (cursor semantics) + Task 3 (builder). ✓
- Filter ⇒ no time-offs → Task 2 (`filter != null` guard, verified by `GetList_SuppressesTimeOffs_WhenFilterActive`). ✓
- No forward bound / backward floor → Task 2 (`NextCursor`/`PrevCursor` via `HasContentOnOrAfter`/`HasContentBefore`, tests `SetsNextCursor`/`NextCursorNull`/`Backwards`). ✓
- Backwards returned ascending → Task 2 (window ordered ascending) + Task 3 (no reversal, test). ✓
- Time-off occurrence generation → Task 1. ✓
- CLAUDE.md updates → folded into Tasks 1, 2, 3, 4, 5. ✓
- Tests (backend/frontend/E2E) → Tasks 1–4 unit, Task 6 E2E + manual. ✓
- Out of scope (time-off/holiday lists) → untouched; `BaseModelService.getListAdvanced` left as-is. ✓

**Placeholder scan:** No TBD/TODO. Every code step shows complete code. The one soft spot is Task 6 Step 4 (optional E2E depends on unread page objects) — deliberately marked optional with a manual fallback, not a hidden placeholder.

**Type consistency:** `AppointmentListPageDTO` gains `NextCursor`/`PrevCursor` (backend `DateOnly?`) ↔ `nextCursor`/`prevCursor` (frontend `string?`). `GetList(DateOnly cursor, Direction, int take, SmartFilter?, int)` is consistent across interface, impl, controller (`date` query param), dashboard caller, and all tests. `CursorPage<T,E>` shape (`items`/`extra`/`nextCursor`/`prevCursor`) matches the builder, the spec dataset, and the service `loadPage`. `groupByContentDay` / `ContentDay` consistent between Task 4 and Task 5.
