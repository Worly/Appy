# Holiday Import — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the backend for automatic public-holiday import: a per-facility country setting, materialization of holidays as one-off `TimeOff` rows linked to a new `ImportedHoliday` provenance entity, a daily import job, and endpoints to list/edit/remove/revert/restore holidays.

**Architecture:** Public holidays are fetched from the free Nager.Date REST API (`date.nager.at` v3) behind an `IHolidayProvider`. Each occurrence becomes an `ImportedHoliday` row (carrying `CountryCode`, `Name`, immutable `Date`) plus a linked one-off, single-day `TimeOff` (`TimeOff.ImportedHolidayId`). The presence of that `TimeOff` means "active"; its absence means "removed". Because active holidays are ordinary `TimeOff` rows, booking-block, calendar expansion, and appointment bundling need **no changes**. A `HolidayService` owns settings, materialization (today → today+1yr, never back-filling), listing, and per-holiday edit/remove/revert/restore. A daily `IScheduledJob` rolls the window forward.

**Tech Stack:** ASP.NET Core 8, EF Core 8 (Npgsql), `DateOnly`/`TimeOnly` (DateOnlyTimeOnly.AspNet), `CronScheduler.AspNetCore`, `System.Text.Json`, xUnit + Moq + Moq.EntityFrameworkCore + FluentAssertions.

## Global Constraints

- Holiday source: **Nager.Date hosted REST API** only (`https://date.nager.at`, v3). Never the licensed offline NuGet.
- Holiday `Name` = the provider's **`localName`** (import country's language), independent of UI language.
- Import window is **today → today + 1 year**, inclusive. **Never back-fill** holidays dated before today.
- Materialize/delete decisions take **`DateOnly today`** as a parameter (never call `DateTime.Today` inside testable methods) — mirrors `AppointmentReminderService.RemindFor(date, now)`.
- Imported holidays are **one-off, single-day** `TimeOff` rows: `Recurrence = OneOff`, `StartDate == EndDate`, `IsAllDay = true` by default, `Label = ImportedHoliday.Name`.
- **Removed** = `ImportedHoliday` exists with **no** linked `TimeOff`. There is no `IsRemoved` flag.
- **Country change / disable** deletes only **future** (`Date >= today`) `ImportedHoliday` rows and their `TimeOff`s; past rows stay as history.
- The import-job / materialize **match key** is `(FacilityId, CountryCode, Date)`.
- **Revert** (edited holiday): reset the linked `TimeOff` to `Date` + all-day, **keep `Notes`**. **Restore** (removed holiday): recreate the `TimeOff` from the snapshot (all-day, no notes).
- Every controller action carries `[Authorize]`, inherits `[SelectedFacility]`, and reads the facility via `HttpContext.SelectedFacility()`.
- Test conventions: xUnit `[Fact]`/`[Theory]`, `new Mock<MainDbContext>()` + `.ReturnsDbSet(list)`, `NullLogger<T>.Instance`, assert behavior via `SaveChangesAsync` verification + in-place entity assertions. Test names: `Method_Expected_Condition`.

---

### Task 1: Domain entities, DbContext, migration

**Files:**
- Create: `Appy/Domain/HolidayImportSettings.cs`
- Create: `Appy/Domain/ImportedHoliday.cs`
- Modify: `Appy/Domain/TimeOff.cs` (add the nullable FK + nav)
- Modify: `Appy/Domain/Facility.cs` (add nav properties — mirror the existing `ClientNotificationsSettings` nav)
- Modify: `Appy/Domain/MainDbContext.cs` (add two `DbSet`s)
- Create (generated): `Appy/Migrations/<timestamp>_AddHolidayImport.cs`

**Interfaces:**
- Produces: `HolidayImportSettings { int FacilityId; string? CountryCode; HolidayImportSettingsDTO GetDTO() }`; `ImportedHoliday { int Id; int FacilityId; Facility Facility; string CountryCode; string Name; DateOnly Date }`; `TimeOff.ImportedHolidayId (int?)` + `TimeOff.ImportedHoliday (ImportedHoliday?)`.

- [ ] **Step 1: Create `HolidayImportSettings` entity**

Mirror `ClientNotificationsSettings` (per-facility, PK = FacilityId). `HolidayImportSettingsDTO` is created in Task 3; add the `using Appy.DTOs;` now and the `GetDTO()` in Task 3 — for this step, define only the entity fields so the migration is complete.

```csharp
// Appy/Domain/HolidayImportSettings.cs
using System.ComponentModel.DataAnnotations;

#pragma warning disable CS8618

namespace Appy.Domain
{
    public class HolidayImportSettings
    {
        [Key]
        public int FacilityId { get; set; }

        // The currently-configured country (ISO code). null ⇒ auto-import is off.
        public string? CountryCode { get; set; }
    }
}
```

- [ ] **Step 2: Create `ImportedHoliday` entity**

```csharp
// Appy/Domain/ImportedHoliday.cs
#pragma warning disable CS8618

namespace Appy.Domain
{
    // One row per materialized holiday occurrence. Durable provenance record: it persists even after
    // its TimeOff is deleted (that absence is the "removed" state). CountryCode is stored per-occurrence
    // because retained history can contain holidays from a previously-configured country.
    public class ImportedHoliday
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public string CountryCode { get; set; }

        // Localized holiday name (provider localName); used as the linked TimeOff's Label.
        public string Name { get; set; }

        // The provider-computed date — immutable; the import job's match key together with (FacilityId, CountryCode).
        public DateOnly Date { get; set; }
    }
}
```

- [ ] **Step 3: Add the link on `TimeOff`**

Add these two properties to the `TimeOff` class in `Appy/Domain/TimeOff.cs` (leave `GetDTO()` unchanged for now — Task 6 exposes the link on the DTO):

```csharp
        // Non-null ⇒ this TimeOff is a materialized imported holiday. See ImportedHoliday.
        public int? ImportedHolidayId { get; set; }
        public ImportedHoliday? ImportedHoliday { get; set; }
```

- [ ] **Step 4: Add nav properties on `Facility`**

Open `Appy/Domain/Facility.cs` and add, alongside the existing collection/nav properties (e.g. next to `ClientNotificationsSettings`):

```csharp
        public HolidayImportSettings? HolidayImportSettings { get; set; }
        public List<ImportedHoliday> ImportedHolidays { get; set; } = new();
```

- [ ] **Step 5: Register the `DbSet`s**

In `Appy/Domain/MainDbContext.cs`, next to `public virtual DbSet<TimeOff> TimeOffs { get; set; }` add:

```csharp
        public virtual DbSet<ImportedHoliday> ImportedHolidays { get; set; }
        public virtual DbSet<HolidayImportSettings> HolidayImportSettings { get; set; }
```

> Both are `virtual` so Moq can override them in tests (matches every other `DbSet` here).

- [ ] **Step 6: Build**

Run: `dotnet build`
Expected: Build succeeded, 0 errors.

- [ ] **Step 7: Create the migration**

Run: `dotnet ef migrations add AddHolidayImport --project Appy`
Expected: creates `Appy/Migrations/<timestamp>_AddHolidayImport.cs`. Open it and confirm it: creates `HolidayImportSettings` (PK `FacilityId`, FK → Facilities), creates `ImportedHolidays` (PK `Id`, FK → Facilities, index on `FacilityId`), and adds `ImportedHolidayId` (nullable) + `IX_TimeOffs_ImportedHolidayId` + FK `FK_TimeOffs_ImportedHolidays_ImportedHolidayId` to `TimeOffs`.

- [ ] **Step 8: Apply the migration**

Run: `dotnet ef database update --project Appy`
Expected: applies cleanly against local Postgres.

- [ ] **Step 9: Commit**

```bash
git add Appy/Domain/ Appy/Migrations/
git commit -m "feat(holiday): ImportedHoliday + HolidayImportSettings entities and migration"
```

---

### Task 2: Nager.Date provider (`IHolidayProvider`)

**Files:**
- Create: `Appy/Services/Holidays/IHolidayProvider.cs`
- Create: `Appy/Services/Holidays/NagerDateHolidayProvider.cs`
- Test: `Appy.Tests/Services/NagerDateHolidayProviderTests.cs`

**Interfaces:**
- Produces:
  - `record ProviderHoliday(DateOnly Date, string LocalName, string CountryCode)`
  - `record ProviderCountry(string CountryCode, string Name)`
  - `interface IHolidayProvider { Task<List<ProviderHoliday>> GetPublicHolidays(int year, string countryCode); Task<List<ProviderCountry>> GetAvailableCountries(); }`
- Consumes: injected `HttpClient` with `BaseAddress = https://date.nager.at` (registered in Task 7).

- [ ] **Step 1: Define the provider contract + result records**

```csharp
// Appy/Services/Holidays/IHolidayProvider.cs
namespace Appy.Services.Holidays
{
    public record ProviderHoliday(DateOnly Date, string LocalName, string CountryCode);

    public record ProviderCountry(string CountryCode, string Name);

    public interface IHolidayProvider
    {
        Task<List<ProviderHoliday>> GetPublicHolidays(int year, string countryCode);
        Task<List<ProviderCountry>> GetAvailableCountries();
    }
}
```

- [ ] **Step 2: Write the failing test (provider maps Nager JSON)**

Uses a stub `HttpMessageHandler` so no network call happens.

```csharp
// Appy.Tests/Services/NagerDateHolidayProviderTests.cs
using System.Net;
using System.Text;
using Appy.Services.Holidays;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Appy.Tests.Services
{
    public class NagerDateHolidayProviderTests
    {
        private static NagerDateHolidayProvider MakeProvider(string json)
        {
            var handler = new StubHandler(json);
            var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://date.nager.at") };
            return new NagerDateHolidayProvider(httpClient, NullLogger<NagerDateHolidayProvider>.Instance);
        }

        [Fact]
        public async Task GetPublicHolidays_MapsLocalNameAndDate()
        {
            var json = """
            [
              { "date": "2026-01-01", "localName": "Nova godina", "name": "New Year's Day", "countryCode": "HR" },
              { "date": "2026-01-06", "localName": "Sveta tri kralja", "name": "Epiphany", "countryCode": "HR" }
            ]
            """;
            var provider = MakeProvider(json);

            var result = await provider.GetPublicHolidays(2026, "HR");

            result.Should().HaveCount(2);
            result[0].Date.Should().Be(new DateOnly(2026, 1, 1));
            result[0].LocalName.Should().Be("Nova godina");
            result[0].CountryCode.Should().Be("HR");
        }

        [Fact]
        public async Task GetAvailableCountries_MapsCodeAndName()
        {
            var json = """[ { "countryCode": "HR", "name": "Croatia" }, { "countryCode": "SI", "name": "Slovenia" } ]""";
            var provider = MakeProvider(json);

            var result = await provider.GetAvailableCountries();

            result.Should().ContainSingle(c => c.CountryCode == "HR" && c.Name == "Croatia");
        }

        private class StubHandler : HttpMessageHandler
        {
            private readonly string json;
            public StubHandler(string json) { this.json = json; }
            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
                => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                });
        }
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `dotnet test --filter "FullyQualifiedName~NagerDateHolidayProviderTests"`
Expected: FAIL — `NagerDateHolidayProvider` does not exist / does not compile.

- [ ] **Step 4: Implement the provider**

```csharp
// Appy/Services/Holidays/NagerDateHolidayProvider.cs
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Appy.Services.Holidays
{
    public class NagerDateHolidayProvider : IHolidayProvider
    {
        private readonly HttpClient httpClient;
        private readonly ILogger<NagerDateHolidayProvider> logger;

        private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

        public NagerDateHolidayProvider(HttpClient httpClient, ILogger<NagerDateHolidayProvider> logger)
        {
            this.httpClient = httpClient;
            this.logger = logger;
        }

        public async Task<List<ProviderHoliday>> GetPublicHolidays(int year, string countryCode)
        {
            var dtos = await Get<List<NagerHolidayDTO>>($"/api/v3/PublicHolidays/{year}/{countryCode}");
            return dtos?
                .Where(d => d.Date != null && d.LocalName != null)
                .Select(d => new ProviderHoliday(DateOnly.Parse(d.Date!), d.LocalName!, d.CountryCode ?? countryCode))
                .ToList() ?? new List<ProviderHoliday>();
        }

        public async Task<List<ProviderCountry>> GetAvailableCountries()
        {
            var dtos = await Get<List<NagerCountryDTO>>("/api/v3/AvailableCountries");
            return dtos?
                .Where(d => d.CountryCode != null && d.Name != null)
                .Select(d => new ProviderCountry(d.CountryCode!, d.Name!))
                .ToList() ?? new List<ProviderCountry>();
        }

        private async Task<T?> Get<T>(string url)
        {
            using var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Nager.Date GET '{Url}' failed: {StatusCode}", url, response.StatusCode);
                return default;
            }
            var stream = await response.Content.ReadAsStreamAsync();
            return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions);
        }

        private class NagerHolidayDTO
        {
            [JsonPropertyName("date")] public string? Date { get; set; }
            [JsonPropertyName("localName")] public string? LocalName { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("countryCode")] public string? CountryCode { get; set; }
        }

        private class NagerCountryDTO
        {
            [JsonPropertyName("countryCode")] public string? CountryCode { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
        }
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `dotnet test --filter "FullyQualifiedName~NagerDateHolidayProviderTests"`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add Appy/Services/Holidays/ Appy.Tests/Services/NagerDateHolidayProviderTests.cs
git commit -m "feat(holiday): Nager.Date holiday provider"
```

---

### Task 3: DTOs + settings get/save (with future-only reset)

**Files:**
- Create: `Appy/DTOs/HolidayImportSettingsDTO.cs`
- Create: `Appy/DTOs/HolidayDTO.cs`
- Create: `Appy/DTOs/HolidayEditDTO.cs`
- Modify: `Appy/Domain/HolidayImportSettings.cs` (add `GetDTO()`)
- Create: `Appy/Services/HolidayService.cs` (interface + class; settings + materialize here, list/edit in Tasks 4–5)
- Test: `Appy.Tests/Services/HolidayServiceTests.cs`

**Interfaces:**
- Produces:
  - `HolidayImportSettingsDTO { string? CountryCode }`
  - `HolidayDTO { int Id; string Name; string CountryCode; DateOnly Date; DateOnly OriginalDate; bool IsAllDay; TimeOnly? TimeFrom; TimeOnly? TimeTo; string? Notes; bool IsEdited; bool IsRemoved }`
  - `HolidayEditDTO { DateOnly Date; bool IsAllDay; TimeOnly? TimeFrom; TimeOnly? TimeTo; string? Notes }`
  - `IHolidayService` with (this task): `Task<HolidayImportSettings> GetSettings(int facilityId)`, `Task<HolidayImportSettings> SaveSettings(int facilityId, string? countryCode, DateOnly today)`, `Task Materialize(int facilityId, string countryCode, DateOnly today)`
- Consumes: `IHolidayProvider` (Task 2); `MainDbContext.ImportedHolidays`, `.TimeOffs`, `.HolidayImportSettings`, `.Facilities`.

- [ ] **Step 1: Create the DTOs**

```csharp
// Appy/DTOs/HolidayImportSettingsDTO.cs
namespace Appy.DTOs
{
    public class HolidayImportSettingsDTO
    {
        public string? CountryCode { get; set; }
    }
}
```

```csharp
// Appy/DTOs/HolidayDTO.cs
namespace Appy.DTOs
{
    public class HolidayDTO
    {
        public int Id { get; set; }               // ImportedHoliday.Id
        public string Name { get; set; } = "";
        public string CountryCode { get; set; } = "";
        public DateOnly Date { get; set; }         // effective date (linked TimeOff's, or OriginalDate if removed)
        public DateOnly OriginalDate { get; set; } // ImportedHoliday.Date
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public string? Notes { get; set; }
        public bool IsEdited { get; set; }
        public bool IsRemoved { get; set; }
    }
}
```

```csharp
// Appy/DTOs/HolidayEditDTO.cs
namespace Appy.DTOs
{
    public class HolidayEditDTO
    {
        public DateOnly Date { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public string? Notes { get; set; }
    }
}
```

- [ ] **Step 2: Add `GetDTO()` to `HolidayImportSettings`**

```csharp
        public HolidayImportSettingsDTO GetDTO()
        {
            return new HolidayImportSettingsDTO { CountryCode = CountryCode };
        }
```

(Add `using Appy.DTOs;` at the top of `HolidayImportSettings.cs`.)

- [ ] **Step 3: Write the failing tests (settings + materialize)**

```csharp
// Appy.Tests/Services/HolidayServiceTests.cs
using Appy.Domain;
using Appy.DTOs;
using Appy.Services;
using Appy.Services.Holidays;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.EntityFrameworkCore;

namespace Appy.Tests.Services
{
    public class HolidayServiceTests
    {
        private const int FacilityId = 1;
        private static readonly DateOnly Today = new(2026, 6, 30);

        private readonly Mock<MainDbContext> dbContextMock = new();
        private readonly Mock<IHolidayProvider> providerMock = new();
        private readonly HolidayService service;

        private readonly List<HolidayImportSettings> settings = new();
        private readonly List<ImportedHoliday> holidays = new();
        private readonly List<TimeOff> timeOffs = new();

        public HolidayServiceTests()
        {
            dbContextMock.Setup(x => x.HolidayImportSettings).ReturnsDbSet(settings);
            dbContextMock.Setup(x => x.ImportedHolidays).ReturnsDbSet(holidays);
            dbContextMock.Setup(x => x.TimeOffs).ReturnsDbSet(timeOffs);
            service = new HolidayService(dbContextMock.Object, providerMock.Object, NullLogger<HolidayService>.Instance);
        }

        private ImportedHoliday SeedHoliday(int id, DateOnly date, string country = "HR", TimeOff? timeOff = null)
        {
            var h = new ImportedHoliday { Id = id, FacilityId = FacilityId, CountryCode = country, Name = "H" + id, Date = date };
            holidays.Add(h);
            if (timeOff != null) { timeOff.ImportedHolidayId = id; timeOff.ImportedHoliday = h; timeOffs.Add(timeOff); }
            return h;
        }

        private static TimeOff Linked(DateOnly date, bool allDay = true) => new()
        {
            FacilityId = FacilityId, Recurrence = TimeOffRecurrence.OneOff,
            StartDate = date, EndDate = date, IsAllDay = allDay, Label = "H"
        };

        [Fact]
        public async Task SaveSettings_NewCountry_MaterializesAndReturnsSettings()
        {
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "HR"))
                .ReturnsAsync(new List<ProviderHoliday> { new(new DateOnly(2026, 12, 25), "Božić", "HR") });

            var result = await service.SaveSettings(FacilityId, "HR", Today);

            result.CountryCode.Should().Be("HR");
            dbContextMock.Verify(x => x.ImportedHolidays.Add(It.Is<ImportedHoliday>(h => h.Date == new DateOnly(2026, 12, 25) && h.Name == "Božić" && h.CountryCode == "HR")), Times.Once);
            dbContextMock.Verify(x => x.TimeOffs.Add(It.Is<TimeOff>(t => t.StartDate == new DateOnly(2026, 12, 25) && t.EndDate == new DateOnly(2026, 12, 25) && t.IsAllDay && t.Label == "Božić")), Times.Once);
            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.AtLeastOnce);
        }

        [Fact]
        public async Task Materialize_SkipsHolidaysBeforeToday()
        {
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "HR"))
                .ReturnsAsync(new List<ProviderHoliday>
                {
                    new(Today.AddDays(-10), "Past", "HR"),   // before today → skipped
                    new(Today.AddDays(10), "Future", "HR"),  // in window → imported
                });

            await service.Materialize(FacilityId, "HR", Today);

            dbContextMock.Verify(x => x.ImportedHolidays.Add(It.Is<ImportedHoliday>(h => h.Name == "Future")), Times.Once);
            dbContextMock.Verify(x => x.ImportedHolidays.Add(It.Is<ImportedHoliday>(h => h.Name == "Past")), Times.Never);
        }

        [Fact]
        public async Task Materialize_SkipsAlreadyPresentOccurrence()
        {
            SeedHoliday(1, Today.AddDays(5), "HR", Linked(Today.AddDays(5)));
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "HR"))
                .ReturnsAsync(new List<ProviderHoliday> { new(Today.AddDays(5), "H1", "HR") });

            await service.Materialize(FacilityId, "HR", Today);

            dbContextMock.Verify(x => x.ImportedHolidays.Add(It.IsAny<ImportedHoliday>()), Times.Never);
        }

        [Fact]
        public async Task SaveSettings_ChangeCountry_DeletesOnlyFutureHolidays()
        {
            settings.Add(new HolidayImportSettings { FacilityId = FacilityId, CountryCode = "HR" });
            var past = SeedHoliday(1, Today.AddDays(-5), "HR", Linked(Today.AddDays(-5)));
            var future = SeedHoliday(2, Today.AddDays(5), "HR", Linked(Today.AddDays(5)));
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "SI")).ReturnsAsync(new List<ProviderHoliday>());

            await service.SaveSettings(FacilityId, "SI", Today);

            dbContextMock.Verify(x => x.ImportedHolidays.RemoveRange(It.Is<IEnumerable<ImportedHoliday>>(hs => hs.Contains(future) && !hs.Contains(past))), Times.Once);
            dbContextMock.Verify(x => x.TimeOffs.RemoveRange(It.Is<IEnumerable<TimeOff>>(ts => ts.Any(t => t.ImportedHolidayId == 2) && ts.All(t => t.ImportedHolidayId != 1))), Times.Once);
        }
    }
}
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests"`
Expected: FAIL — `HolidayService` does not exist.

- [ ] **Step 5: Implement `IHolidayService` + settings/materialize**

```csharp
// Appy/Services/HolidayService.cs
using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services.Holidays;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IHolidayService
    {
        Task<HolidayImportSettings> GetSettings(int facilityId);
        Task<HolidayImportSettings> SaveSettings(int facilityId, string? countryCode, DateOnly today);
        Task Materialize(int facilityId, string countryCode, DateOnly today);
        Task<List<ProviderCountry>> GetSupportedCountries();
    }

    public class HolidayService : IHolidayService
    {
        private readonly MainDbContext context;
        private readonly IHolidayProvider provider;
        private readonly ILogger<HolidayService> logger;

        public HolidayService(MainDbContext context, IHolidayProvider provider, ILogger<HolidayService> logger)
        {
            this.context = context;
            this.provider = provider;
            this.logger = logger;
        }

        public async Task<HolidayImportSettings> GetSettings(int facilityId)
        {
            var settings = await context.HolidayImportSettings.FirstOrDefaultAsync(s => s.FacilityId == facilityId);
            return settings ?? new HolidayImportSettings { FacilityId = facilityId };
        }

        public async Task<HolidayImportSettings> SaveSettings(int facilityId, string? countryCode, DateOnly today)
        {
            var settings = await context.HolidayImportSettings.FirstOrDefaultAsync(s => s.FacilityId == facilityId);
            if (settings == null)
            {
                settings = new HolidayImportSettings { FacilityId = facilityId };
                context.HolidayImportSettings.Add(settings);
            }

            var changed = settings.CountryCode != countryCode;
            settings.CountryCode = countryCode;

            if (changed)
            {
                // Remove only FUTURE imported holidays (and their TimeOffs); past ones stay as history.
                var futureHolidays = await context.ImportedHolidays
                    .Where(h => h.FacilityId == facilityId && h.Date >= today)
                    .ToListAsync();
                var futureIds = futureHolidays.Select(h => h.Id).ToList();
                var futureTimeOffs = await context.TimeOffs
                    .Where(t => t.ImportedHolidayId != null && futureIds.Contains(t.ImportedHolidayId.Value))
                    .ToListAsync();

                context.TimeOffs.RemoveRange(futureTimeOffs);
                context.ImportedHolidays.RemoveRange(futureHolidays);
            }

            await context.SaveChangesAsync();

            if (changed && countryCode != null)
                await Materialize(facilityId, countryCode, today);

            logger.LogInformation("Holiday import settings saved (country {CountryCode})", countryCode);
            return settings;
        }

        public async Task Materialize(int facilityId, string countryCode, DateOnly today)
        {
            var to = today.AddYears(1);

            var providerHolidays = new List<ProviderHoliday>();
            for (var year = today.Year; year <= to.Year; year++)
                providerHolidays.AddRange(await provider.GetPublicHolidays(year, countryCode));

            var inWindow = providerHolidays.Where(h => h.Date >= today && h.Date <= to);

            var existing = await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId && h.CountryCode == countryCode)
                .Select(h => h.Date)
                .ToListAsync();
            var existingDates = existing.ToHashSet();

            var added = false;
            foreach (var h in inWindow)
            {
                if (!existingDates.Add(h.Date)) // already present (also dedups within provider payload)
                    continue;

                var imported = new ImportedHoliday
                {
                    FacilityId = facilityId,
                    CountryCode = countryCode,
                    Name = h.LocalName,
                    Date = h.Date,
                };
                context.ImportedHolidays.Add(imported);
                context.TimeOffs.Add(new TimeOff
                {
                    FacilityId = facilityId,
                    Label = h.LocalName,
                    Recurrence = TimeOffRecurrence.OneOff,
                    StartDate = h.Date,
                    EndDate = h.Date,
                    IsAllDay = true,
                    ImportedHoliday = imported,
                });
                added = true;
            }

            if (added)
                await context.SaveChangesAsync();
        }

        public Task<List<ProviderCountry>> GetSupportedCountries() => provider.GetAvailableCountries();
    }
}
```

> The `existingDates` `HashSet` does double duty: it skips occurrences already in the DB **and** dedups repeats inside a single provider payload (same date returned twice), so `Add` returning `false` short-circuits both.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests"`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add Appy/DTOs/HolidayImportSettingsDTO.cs Appy/DTOs/HolidayDTO.cs Appy/DTOs/HolidayEditDTO.cs Appy/Domain/HolidayImportSettings.cs Appy/Services/HolidayService.cs Appy.Tests/Services/HolidayServiceTests.cs
git commit -m "feat(holiday): settings get/save with future-only reset + materialization"
```

---

### Task 4: List holidays (paged, scope, edited/removed derivation)

**Files:**
- Modify: `Appy/Services/HolidayService.cs` (add `GetList`)
- Modify: `Appy.Tests/Services/HolidayServiceTests.cs` (add list tests)

**Interfaces:**
- Produces: `Task<List<HolidayDTO>> GetList(TimeOffScope scope, int skip, int take, DateOnly today, int facilityId)` on `IHolidayService`. Reuses the existing `TimeOffScope { Active, History }` enum (`Appy/DTOs/TimeOffListType.cs`).
- The effective date = linked `TimeOff.StartDate` if present, else `ImportedHoliday.Date`. `IsRemoved` = no linked TimeOff. `IsEdited` = linked TimeOff exists AND (`StartDate != ImportedHoliday.Date` OR `!IsAllDay`). Active = effective date `>= today`; History = `< today`. Sort ascending by effective date for Active, descending for History.

- [ ] **Step 1: Write the failing tests**

Add to `HolidayServiceTests`:

```csharp
        [Fact]
        public async Task GetList_Active_ReturnsUpcomingWithEditedAndRemovedFlags()
        {
            // untouched upcoming
            SeedHoliday(1, Today.AddDays(3), "HR", Linked(Today.AddDays(3)));
            // edited upcoming (time set → not all-day)
            SeedHoliday(2, Today.AddDays(4), "HR", Linked(Today.AddDays(4), allDay: false));
            // removed upcoming (no TimeOff)
            SeedHoliday(3, Today.AddDays(5), "HR");
            // past → excluded from Active
            SeedHoliday(4, Today.AddDays(-3), "HR", Linked(Today.AddDays(-3)));

            var result = await service.GetList(TimeOffScope.Active, skip: 0, take: 50, Today, FacilityId);

            result.Should().HaveCount(3);
            result.Select(r => r.Id).Should().ContainInOrder(1, 2, 3); // ascending by date
            result.Single(r => r.Id == 1).IsEdited.Should().BeFalse();
            result.Single(r => r.Id == 2).IsEdited.Should().BeTrue();
            result.Single(r => r.Id == 3).IsRemoved.Should().BeTrue();
        }

        [Fact]
        public async Task GetList_EditedDateMove_ReportsEffectiveDateAndOriginalDate()
        {
            var linked = Linked(Today.AddDays(9)); // moved 2 days later than original
            SeedHoliday(1, Today.AddDays(7), "HR", linked);

            var result = await service.GetList(TimeOffScope.Active, 0, 50, Today, FacilityId);

            var dto = result.Single();
            dto.Date.Should().Be(Today.AddDays(9));
            dto.OriginalDate.Should().Be(Today.AddDays(7));
            dto.IsEdited.Should().BeTrue();
        }
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests"`
Expected: FAIL — `GetList` not defined.

- [ ] **Step 3: Implement `GetList`**

Add the signature to `IHolidayService` and this method to `HolidayService` (add `using Appy.DTOs;` if not present):

```csharp
        public async Task<List<HolidayDTO>> GetList(TimeOffScope scope, int skip, int take, DateOnly today, int facilityId)
        {
            var holidays = await context.ImportedHolidays
                .Where(h => h.FacilityId == facilityId)
                .ToListAsync();

            var linkedTimeOffs = await context.TimeOffs
                .Where(t => t.FacilityId == facilityId && t.ImportedHolidayId != null)
                .ToListAsync();
            var timeOffByHolidayId = linkedTimeOffs.ToDictionary(t => t.ImportedHolidayId!.Value, t => t);

            var dtos = holidays.Select(h =>
            {
                timeOffByHolidayId.TryGetValue(h.Id, out var t);
                var isRemoved = t == null;
                var effectiveDate = t?.StartDate ?? h.Date;
                var isEdited = t != null && (t.StartDate != h.Date || !t.IsAllDay);
                return new HolidayDTO
                {
                    Id = h.Id,
                    Name = h.Name,
                    CountryCode = h.CountryCode,
                    Date = effectiveDate,
                    OriginalDate = h.Date,
                    IsAllDay = t?.IsAllDay ?? true,
                    TimeFrom = t?.TimeFrom,
                    TimeTo = t?.TimeTo,
                    Notes = t?.Notes,
                    IsEdited = isEdited,
                    IsRemoved = isRemoved,
                };
            });

            dtos = scope == TimeOffScope.Active
                ? dtos.Where(d => d.Date >= today).OrderBy(d => d.Date)
                : dtos.Where(d => d.Date < today).OrderByDescending(d => d.Date);

            return dtos.Skip(skip).Take(take).ToList();
        }
```

- [ ] **Step 4: Run to verify passing**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests"`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add Appy/Services/HolidayService.cs Appy.Tests/Services/HolidayServiceTests.cs
git commit -m "feat(holiday): paged list with edited/removed derivation"
```

---

### Task 5: Edit, Remove, Revert, Restore

**Files:**
- Modify: `Appy/Services/HolidayService.cs`
- Modify: `Appy.Tests/Services/HolidayServiceTests.cs`

**Interfaces:**
- Produces on `IHolidayService`:
  - `Task Edit(int importedHolidayId, HolidayEditDTO dto, int facilityId)`
  - `Task Remove(int importedHolidayId, int facilityId)`
  - `Task Revert(int importedHolidayId, int facilityId)`
  - `Task Restore(int importedHolidayId, int facilityId)`
- All throw `NotFoundException` (from `Appy.Exceptions`) when the target holiday/state doesn't exist for the facility.

- [ ] **Step 1: Write the failing tests**

Add to `HolidayServiceTests`:

```csharp
        [Fact]
        public async Task Edit_SetsTimeOnLinkedTimeOff_KeepingSingleDay()
        {
            var linked = Linked(Today.AddDays(5));
            SeedHoliday(1, Today.AddDays(5), "HR", linked);

            await service.Edit(1, new HolidayEditDTO
            {
                Date = Today.AddDays(6),
                IsAllDay = false,
                TimeFrom = new TimeOnly(12, 0),
                TimeTo = new TimeOnly(17, 0),
                Notes = "Closing early",
            }, FacilityId);

            linked.StartDate.Should().Be(Today.AddDays(6));
            linked.EndDate.Should().Be(Today.AddDays(6)); // stays single-day
            linked.IsAllDay.Should().BeFalse();
            linked.TimeFrom.Should().Be(new TimeOnly(12, 0));
            linked.Notes.Should().Be("Closing early");
            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task Remove_DeletesLinkedTimeOff_KeepsImportedHoliday()
        {
            var linked = Linked(Today.AddDays(5));
            SeedHoliday(1, Today.AddDays(5), "HR", linked);

            await service.Remove(1, FacilityId);

            dbContextMock.Verify(x => x.TimeOffs.Remove(linked), Times.Once);
            dbContextMock.Verify(x => x.ImportedHolidays.Remove(It.IsAny<ImportedHoliday>()), Times.Never);
            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task Revert_ResetsDateAndTime_KeepsNotes()
        {
            var linked = Linked(Today.AddDays(9), allDay: false);
            linked.TimeFrom = new TimeOnly(12, 0);
            linked.TimeTo = new TimeOnly(17, 0);
            linked.Notes = "keep me";
            SeedHoliday(1, Today.AddDays(7), "HR", linked); // original date = +7

            await service.Revert(1, FacilityId);

            linked.StartDate.Should().Be(Today.AddDays(7));
            linked.EndDate.Should().Be(Today.AddDays(7));
            linked.IsAllDay.Should().BeTrue();
            linked.TimeFrom.Should().BeNull();
            linked.TimeTo.Should().BeNull();
            linked.Notes.Should().Be("keep me"); // notes preserved
        }

        [Fact]
        public async Task Restore_RecreatesTimeOffFromSnapshot_NoNotes()
        {
            SeedHoliday(1, Today.AddDays(5), "HR"); // removed: no linked TimeOff

            await service.Restore(1, FacilityId);

            dbContextMock.Verify(x => x.TimeOffs.Add(It.Is<TimeOff>(t =>
                t.ImportedHolidayId == 1 && t.StartDate == Today.AddDays(5) && t.EndDate == Today.AddDays(5)
                && t.IsAllDay && t.Notes == null && t.Label == "H1")), Times.Once);
            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests"`
Expected: FAIL — the four methods don't exist.

- [ ] **Step 3: Implement the four methods**

Add signatures to `IHolidayService` and these to `HolidayService`:

```csharp
        public async Task Edit(int importedHolidayId, HolidayEditDTO dto, int facilityId)
        {
            var timeOff = await FindLinkedTimeOff(importedHolidayId, facilityId)
                ?? throw new NotFoundException();

            timeOff.StartDate = dto.Date;
            timeOff.EndDate = dto.Date;           // single-day, always
            timeOff.IsAllDay = dto.IsAllDay;
            timeOff.TimeFrom = dto.IsAllDay ? null : dto.TimeFrom;
            timeOff.TimeTo = dto.IsAllDay ? null : dto.TimeTo;
            timeOff.Notes = dto.Notes;

            await context.SaveChangesAsync();
        }

        public async Task Remove(int importedHolidayId, int facilityId)
        {
            var timeOff = await FindLinkedTimeOff(importedHolidayId, facilityId)
                ?? throw new NotFoundException();

            context.TimeOffs.Remove(timeOff);
            await context.SaveChangesAsync();
        }

        public async Task Revert(int importedHolidayId, int facilityId)
        {
            var holiday = await FindHoliday(importedHolidayId, facilityId)
                ?? throw new NotFoundException();
            var timeOff = await FindLinkedTimeOff(importedHolidayId, facilityId)
                ?? throw new NotFoundException();

            timeOff.StartDate = holiday.Date;
            timeOff.EndDate = holiday.Date;
            timeOff.IsAllDay = true;
            timeOff.TimeFrom = null;
            timeOff.TimeTo = null;
            // Notes are intentionally preserved.

            await context.SaveChangesAsync();
        }

        public async Task Restore(int importedHolidayId, int facilityId)
        {
            var holiday = await FindHoliday(importedHolidayId, facilityId)
                ?? throw new NotFoundException();
            var existing = await FindLinkedTimeOff(importedHolidayId, facilityId);
            if (existing != null)
                return; // already active — nothing to restore

            context.TimeOffs.Add(new TimeOff
            {
                FacilityId = facilityId,
                Label = holiday.Name,
                Recurrence = TimeOffRecurrence.OneOff,
                StartDate = holiday.Date,
                EndDate = holiday.Date,
                IsAllDay = true,
                ImportedHolidayId = holiday.Id,
            });

            await context.SaveChangesAsync();
        }

        private Task<ImportedHoliday?> FindHoliday(int importedHolidayId, int facilityId)
            => context.ImportedHolidays.FirstOrDefaultAsync(h => h.Id == importedHolidayId && h.FacilityId == facilityId);

        private Task<TimeOff?> FindLinkedTimeOff(int importedHolidayId, int facilityId)
            => context.TimeOffs.FirstOrDefaultAsync(t => t.ImportedHolidayId == importedHolidayId && t.FacilityId == facilityId);
```

- [ ] **Step 4: Run to verify passing**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests"`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add Appy/Services/HolidayService.cs Appy.Tests/Services/HolidayServiceTests.cs
git commit -m "feat(holiday): edit, remove, revert, restore operations"
```

---

### Task 6: HolidayController + expose the link on `TimeOffDTO`

**Files:**
- Create: `Appy/Controllers/HolidayController.cs`
- Modify: `Appy/Domain/TimeOff.cs` (add `ImportedHolidayId` to `GetDTO()`)
- Modify: `Appy/DTOs/TimeOffDTO.cs` (add `ImportedHolidayId`)

**Interfaces:**
- Consumes: `IHolidayService` (Tasks 3–5). Produces the HTTP surface consumed by the frontend plan.
- Route prefix `/holiday`. Endpoints:
  - `GET /holiday/settings` → `HolidayImportSettingsDTO`
  - `PUT /holiday/settings` (body `HolidayImportSettingsDTO`) → `HolidayImportSettingsDTO`
  - `GET /holiday/getSupportedCountries` → `List<ProviderCountry>`
  - `GET /holiday/getList?scope=&skip=&take=` → `List<HolidayDTO>`
  - `PUT /holiday/edit/{id}` (body `HolidayEditDTO`) → 200
  - `PUT /holiday/remove/{id}` → 200
  - `PUT /holiday/revert/{id}` → 200
  - `PUT /holiday/restore/{id}` → 200

> Controllers are not unit-tested in this project (verified: no `Controllers/` test dir). This task's verification is `dotnet build` + the app boots; behavior is covered by the service tests and the frontend E2E plan.

- [ ] **Step 1: Expose `ImportedHolidayId` on `TimeOffDTO`**

The frontend details dialog opens via `timeOffService.get(id)`; it needs to know whether a `TimeOff` is an imported holiday. Add to `Appy/DTOs/TimeOffDTO.cs`:

```csharp
        public int? ImportedHolidayId { get; set; }
```

And in `TimeOff.GetDTO()` (in `Appy/Domain/TimeOff.cs`) add the mapping line:

```csharp
                ImportedHolidayId = ImportedHolidayId,
```

- [ ] **Step 2: Create the controller**

```csharp
// Appy/Controllers/HolidayController.cs
using Appy.Auth;
using Appy.DTOs;
using Appy.Services;
using Appy.Services.Facilities;
using Appy.Services.Holidays;
using Microsoft.AspNetCore.Mvc;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class HolidayController : ControllerBase
    {
        private readonly IHolidayService holidayService;

        public HolidayController(IHolidayService holidayService)
        {
            this.holidayService = holidayService;
        }

        private static DateOnly Today => DateOnly.FromDateTime(DateTime.Today);

        [HttpGet("settings")]
        [Authorize]
        public async Task<ActionResult<HolidayImportSettingsDTO>> GetSettings()
        {
            var result = await holidayService.GetSettings(HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }

        [HttpPut("settings")]
        [Authorize]
        public async Task<ActionResult<HolidayImportSettingsDTO>> SaveSettings(HolidayImportSettingsDTO dto)
        {
            var result = await holidayService.SaveSettings(HttpContext.SelectedFacility(), dto.CountryCode, Today);
            return Ok(result.GetDTO());
        }

        [HttpGet("getSupportedCountries")]
        [Authorize]
        public async Task<ActionResult<List<ProviderCountry>>> GetSupportedCountries()
        {
            return Ok(await holidayService.GetSupportedCountries());
        }

        [HttpGet("getList")]
        [Authorize]
        public async Task<ActionResult<List<HolidayDTO>>> GetList([FromQuery] TimeOffScope scope, [FromQuery] int skip, [FromQuery] int take)
        {
            var result = await holidayService.GetList(scope, skip, take, Today, HttpContext.SelectedFacility());
            return Ok(result);
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult> Edit(int id, HolidayEditDTO dto)
        {
            await holidayService.Edit(id, dto, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("remove/{id}")]
        [Authorize]
        public async Task<ActionResult> Remove(int id)
        {
            await holidayService.Remove(id, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("revert/{id}")]
        [Authorize]
        public async Task<ActionResult> Revert(int id)
        {
            await holidayService.Revert(id, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("restore/{id}")]
        [Authorize]
        public async Task<ActionResult> Restore(int id)
        {
            await holidayService.Restore(id, HttpContext.SelectedFacility());
            return Ok();
        }
    }
}
```

> The frontend's paged list seam sends `direction`/`skip`/`take`; here only `skip`/`take`/`scope` are read (holidays paginate forward-only per scope), and the extra `direction` query param is harmless.

- [ ] **Step 3: Build**

Run: `dotnet build`
Expected: Build succeeded, 0 errors. (Endpoints are wired once DI is added in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add Appy/Controllers/HolidayController.cs Appy/DTOs/TimeOffDTO.cs Appy/Domain/TimeOff.cs
git commit -m "feat(holiday): HolidayController + expose ImportedHolidayId on TimeOffDTO"
```

---

### Task 7: DI registration + daily import job

**Files:**
- Create: `Appy/Services/HolidayImportScheduledJob.cs`
- Modify: `Appy/Program.cs` (register provider HttpClient, service, and the cron job)
- Modify: `Appy/Services/HolidayService.cs` (add `MaterializeForAllFacilities`)
- Modify: `Appy.Tests/Services/HolidayServiceTests.cs` (test the fan-out)

**Interfaces:**
- Produces on `IHolidayService`: `Task MaterializeForAllFacilities(DateOnly today)`.
- `HolidayImportScheduledJob : IScheduledJob` — mirrors `AppointmentReminderScheduledJob` (injects `IServiceProvider`, creates a scope, resolves `IHolidayService`).

- [ ] **Step 1: Write the failing test (fan-out over configured facilities)**

Add to `HolidayServiceTests`:

```csharp
        [Fact]
        public async Task MaterializeForAllFacilities_MaterializesEachConfiguredFacility()
        {
            settings.Add(new HolidayImportSettings { FacilityId = 1, CountryCode = "HR" });
            settings.Add(new HolidayImportSettings { FacilityId = 2, CountryCode = "SI" });
            settings.Add(new HolidayImportSettings { FacilityId = 3, CountryCode = null }); // disabled → skipped
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync(new List<ProviderHoliday>());

            await service.MaterializeForAllFacilities(Today);

            providerMock.Verify(x => x.GetPublicHolidays(It.IsAny<int>(), "HR"), Times.AtLeastOnce);
            providerMock.Verify(x => x.GetPublicHolidays(It.IsAny<int>(), "SI"), Times.AtLeastOnce);
            providerMock.Verify(x => x.GetPublicHolidays(It.IsAny<int>(), It.Is<string>(c => c == null)), Times.Never);
        }
```

- [ ] **Step 2: Run to verify failure**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests.MaterializeForAllFacilities"`
Expected: FAIL — method not defined.

- [ ] **Step 3: Implement `MaterializeForAllFacilities`**

Add the signature to `IHolidayService` and this to `HolidayService`:

```csharp
        public async Task MaterializeForAllFacilities(DateOnly today)
        {
            var configured = await context.HolidayImportSettings
                .Where(s => s.CountryCode != null)
                .Select(s => new { s.FacilityId, s.CountryCode })
                .ToListAsync();

            foreach (var s in configured)
                await Materialize(s.FacilityId, s.CountryCode!, today);
        }
```

- [ ] **Step 4: Run to verify passing**

Run: `dotnet test --filter "FullyQualifiedName~HolidayServiceTests.MaterializeForAllFacilities"`
Expected: PASS.

- [ ] **Step 5: Create the scheduled job**

```csharp
// Appy/Services/HolidayImportScheduledJob.cs
using CronScheduler.Extensions.Scheduler;

namespace Appy.Services
{
    public class HolidayImportScheduledJob : IScheduledJob
    {
        public string Name => nameof(HolidayImportScheduledJob);

        private readonly IServiceProvider serviceProvider;

        public HolidayImportScheduledJob(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public async Task ExecuteAsync(CancellationToken cancellationToken)
        {
            using var scope = serviceProvider.CreateScope();
            var holidayService = scope.ServiceProvider.GetRequiredService<IHolidayService>();
            await holidayService.MaterializeForAllFacilities(DateOnly.FromDateTime(DateTime.Today));
        }
    }
}
```

> Confirm the `using` matches `AppointmentReminderScheduledJob`'s namespace for `IScheduledJob` (open that file — it's `CronScheduler.Extensions.Scheduler`; if it differs, match it exactly).

- [ ] **Step 6: Register provider, service, and job in `Program.cs`**

In the `AddScoped` block (next to `AddScoped<ITimeOffService, TimeOffService>()`) add:

```csharp
builder.Services.AddScoped<IHolidayService, HolidayService>();
```

Next to the existing `AddHttpClient<InstagramMessagingService>(...)` add:

```csharp
builder.Services.AddHttpClient<IHolidayProvider, NagerDateHolidayProvider>(client =>
{
    client.BaseAddress = new Uri("https://date.nager.at");
});
```

Inside the existing `AddScheduler(config => { ... })` block, alongside `config.AddJob<AppointmentReminderScheduledJob>(...)` add:

```csharp
    config.AddJob<HolidayImportScheduledJob>(configure: c =>
    {
        c.CronSchedule = "0 3 * * *"; // daily at 03:00 UTC
        c.CronTimeZone = "utc";
        c.RunImmediately = false;
    });
```

Add the needed `using Appy.Services.Holidays;` at the top of `Program.cs` if not already resolved.

- [ ] **Step 7: Build + full test run**

Run: `dotnet build`
Expected: Build succeeded.
Run: `dotnet test`
Expected: all tests pass (existing + new `HolidayServiceTests` and `NagerDateHolidayProviderTests`).

- [ ] **Step 8: Smoke-test the running app**

Run: `dotnet run --project Appy` (backend on `https://localhost:5001`). With a logged-in facility (or via Swagger at `/swagger`), `PUT /holiday/settings` with `{ "countryCode": "HR" }`, then `GET /holiday/getList?scope=Active&skip=0&take=50` and confirm holidays come back. Then `GET /timeoff/getList?type=OneOff&scope=Active&skip=0&take=50` — the imported holidays should also appear as one-off time-off (proving booking-block/expansion reuse). Stop the app.

- [ ] **Step 9: Commit**

```bash
git add Appy/Services/HolidayImportScheduledJob.cs Appy/Program.cs Appy/Services/HolidayService.cs Appy.Tests/Services/HolidayServiceTests.cs
git commit -m "feat(holiday): daily import job + DI wiring"
```

---

## Self-Review

**Spec coverage:**
- Choose country → Task 3 (`SaveSettings`) + Task 6 (`PUT /settings`). ✓
- Materialize as one-off single-day TimeOff linked to ImportedHoliday → Task 3 (`Materialize`). ✓
- Import window today→+1yr, never back-fill → Task 3 (`Materialize` window filter) + `Materialize_SkipsHolidaysBeforeToday`. ✓
- Per-holiday CountryCode + match key (facility, country, date) → Task 1 (field) + Task 3 (`existingDates` per country). ✓
- Future-only deletion on country change, history retained → Task 3 (`SaveSettings`) + `SaveSettings_ChangeCountry_DeletesOnlyFutureHolidays`. ✓
- List with edited/removed + originals, scope, paging → Task 4. ✓
- Edit (single-day, time, notes) / Remove / Revert (keep notes) / Restore (no notes) → Task 5. ✓
- Removed = no linked TimeOff; booking-block untouched → Tasks 1, 5; smoke test Step 8 (Task 7). ✓
- Daily job → Task 7. ✓
- Names use localName → Task 2 (maps `localName`) + Task 3 (stores `h.LocalName` as `Name`/`Label`). ✓
- No pruning → nothing deletes past rows (only future on country change). ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `IHolidayService` methods, `HolidayDTO`/`HolidayEditDTO`/`HolidayImportSettingsDTO` fields, `ProviderHoliday`/`ProviderCountry` records, and `TimeOff.ImportedHolidayId` are used identically across tasks. `TimeOffScope` is the existing enum reused by `GetList`.

## Out of scope (this is the backend plan)

Frontend model/service/components, the configure dialog, translations, and Cypress E2E are covered by the **frontend** plan (`docs/superpowers/plans/2026-07-01-holiday-import-frontend.md`). Subdivision/region selection remains deferred per the spec.
