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

        [Fact]
        public async Task SaveSettings_ProviderDown_PersistsNothing()
        {
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "HR"))
                .ThrowsAsync(new HolidayProviderException("down"));

            await Assert.ThrowsAsync<HolidayProviderException>(() => service.SaveSettings(FacilityId, "HR", Today));

            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }
    }
}
