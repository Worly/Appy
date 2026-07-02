using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
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

        [Fact]
        public async Task GetById_ReturnsHolidayWithDerivedState()
        {
            SeedHoliday(1, Today.AddDays(5), "HR", Linked(Today.AddDays(5), allDay: false));

            var dto = await service.GetById(1, FacilityId);

            dto.Should().NotBeNull();
            dto!.Id.Should().Be(1);
            dto.IsEdited.Should().BeTrue();
            dto.IsRemoved.Should().BeFalse();
        }

        [Fact]
        public async Task GetById_ReturnsNull_WhenNotFoundForFacility()
        {
            (await service.GetById(999, FacilityId)).Should().BeNull();
        }

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
            linked.TimeTo.Should().Be(new TimeOnly(17, 0));
            linked.Notes.Should().Be("Closing early");
            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task Edit_AllDay_ClearsTimeRange()
        {
            var linked = Linked(Today.AddDays(5), allDay: false);
            linked.TimeFrom = new TimeOnly(12, 0);
            linked.TimeTo = new TimeOnly(17, 0);
            SeedHoliday(1, Today.AddDays(5), "HR", linked);

            await service.Edit(1, new HolidayEditDTO { Date = Today.AddDays(5), IsAllDay = true }, FacilityId);

            linked.IsAllDay.Should().BeTrue();
            linked.TimeFrom.Should().BeNull();
            linked.TimeTo.Should().BeNull();
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

        [Fact]
        public async Task MaterializeForAllFacilities_ContinuesWhenOneFacilityProviderFails()
        {
            settings.Add(new HolidayImportSettings { FacilityId = 1, CountryCode = "HR" });
            settings.Add(new HolidayImportSettings { FacilityId = 2, CountryCode = "SI" });
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "HR")).ThrowsAsync(new HolidayProviderException("down"));
            providerMock.Setup(x => x.GetPublicHolidays(It.IsAny<int>(), "SI")).ReturnsAsync(new List<ProviderHoliday>());

            await service.MaterializeForAllFacilities(Today); // must not throw despite HR failing

            providerMock.Verify(x => x.GetPublicHolidays(It.IsAny<int>(), "SI"), Times.AtLeastOnce);
        }
    }
}
