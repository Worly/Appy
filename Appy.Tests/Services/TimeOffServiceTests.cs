using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services;
using Moq;
using Moq.EntityFrameworkCore;

namespace Appy.Tests.Services
{
    public class TimeOffServiceTests
    {
        private const int FacilityId = 1;

        private readonly Mock<MainDbContext> dbContextMock;
        private readonly TimeOffService service;
        private readonly List<TimeOff> timeOffs = new();

        public TimeOffServiceTests()
        {
            dbContextMock = new Mock<MainDbContext>();
            dbContextMock.Setup(x => x.TimeOffs).ReturnsDbSet(timeOffs);
            service = new TimeOffService(dbContextMock.Object);
        }

        private static TimeOffDTO ValidOneOff() => new()
        {
            Label = "Vacation",
            Recurrence = TimeOffRecurrence.OneOff,
            StartDate = new DateOnly(2030, 6, 1),
            EndDate = new DateOnly(2030, 6, 5),
            IsAllDay = true,
        };

        [Fact]
        public async Task AddNew_Throws_WhenLabelMissing()
        {
            var dto = ValidOneOff();
            dto.Label = "   ";
            await Assert.ThrowsAsync<ValidationException>(() => service.AddNew(dto, FacilityId));
        }

        [Fact]
        public async Task AddNew_Throws_WhenOneOffMissingDates()
        {
            var dto = ValidOneOff();
            dto.EndDate = null;
            await Assert.ThrowsAsync<ValidationException>(() => service.AddNew(dto, FacilityId));
        }

        [Fact]
        public async Task AddNew_Throws_WhenOneOffDatesOutOfOrder()
        {
            var dto = ValidOneOff();
            dto.StartDate = new DateOnly(2030, 6, 10);
            await Assert.ThrowsAsync<ValidationException>(() => service.AddNew(dto, FacilityId));
        }

        [Fact]
        public async Task AddNew_Throws_WhenPartialTimesOutOfOrder()
        {
            var dto = ValidOneOff();
            dto.IsAllDay = false;
            dto.TimeFrom = new TimeOnly(13, 0);
            dto.TimeTo = new TimeOnly(12, 0);
            await Assert.ThrowsAsync<ValidationException>(() => service.AddNew(dto, FacilityId));
        }

        [Fact]
        public async Task AddNew_Throws_WhenWeeklyMissingDayOfWeek()
        {
            var dto = ValidOneOff();
            dto.Recurrence = TimeOffRecurrence.Weekly;
            dto.DayOfWeek = null;
            await Assert.ThrowsAsync<ValidationException>(() => service.AddNew(dto, FacilityId));
        }

        [Fact]
        public async Task AddNew_Throws_WhenMonthlyDayOutOfRange()
        {
            var dto = ValidOneOff();
            dto.Recurrence = TimeOffRecurrence.Monthly;
            dto.DayOfMonth = 32;
            await Assert.ThrowsAsync<ValidationException>(() => service.AddNew(dto, FacilityId));
        }

        [Fact]
        public async Task AddNew_NullsIrrelevantFields()
        {
            var dto = ValidOneOff();
            dto.Recurrence = TimeOffRecurrence.Weekly;
            dto.DayOfWeek = DayOfWeek.Monday;
            dto.DayOfMonth = 15;      // irrelevant for Weekly — must be nulled
            dto.IsAllDay = true;
            dto.TimeFrom = new TimeOnly(9, 0);  // irrelevant for all-day — must be nulled

            var result = await service.AddNew(dto, FacilityId);

            Assert.Null(result.DayOfMonth);
            Assert.Null(result.TimeFrom);
            Assert.Equal(FacilityId, result.FacilityId);
        }

        private TimeOff Seed(TimeOff t) { t.FacilityId = FacilityId; timeOffs.Add(t); return t; }

        [Fact]
        public void AppliesOn_OneOff_WithinRange()
        {
            var t = new TimeOff { Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 6, 1), EndDate = new DateOnly(2030, 6, 5) };
            Assert.True(service.AppliesOn(t, new DateOnly(2030, 6, 3)));
            Assert.True(service.AppliesOn(t, new DateOnly(2030, 6, 1)));
            Assert.True(service.AppliesOn(t, new DateOnly(2030, 6, 5)));
            Assert.False(service.AppliesOn(t, new DateOnly(2030, 6, 6)));
        }

        [Fact]
        public void AppliesOn_Weekly_MatchesDayWithinOptionalBounds()
        {
            // 2030-06-03 is a Monday.
            var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday };
            Assert.True(service.AppliesOn(t, new DateOnly(2030, 6, 3)));
            Assert.False(service.AppliesOn(t, new DateOnly(2030, 6, 4)));

            t.StartDate = new DateOnly(2030, 6, 10);   // bound excludes the 3rd
            Assert.False(service.AppliesOn(t, new DateOnly(2030, 6, 3)));
            Assert.True(service.AppliesOn(t, new DateOnly(2030, 6, 10)));
        }

        [Fact]
        public void AppliesOn_Monthly_MatchesDayAndSkipsMissingDays()
        {
            var t = new TimeOff { Recurrence = TimeOffRecurrence.Monthly, DayOfMonth = 31 };
            Assert.True(service.AppliesOn(t, new DateOnly(2030, 1, 31)));
            Assert.False(service.AppliesOn(t, new DateOnly(2030, 2, 28))); // February has no 31st → never applies
        }

        [Fact]
        public async Task GetOccurrencesForDate_ExpandsAndMapsAllDay()
        {
            Seed(new TimeOff { Label = "Closed", Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, IsAllDay = true });
            Seed(new TimeOff { Label = "Lunch", Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, IsAllDay = false, TimeFrom = new TimeOnly(12, 0), TimeTo = new TimeOnly(13, 0) });
            Seed(new TimeOff { Label = "Other", Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Tuesday, IsAllDay = true });

            var occ = await service.GetOccurrencesForDate(new DateOnly(2030, 6, 3), FacilityId); // Monday

            Assert.Equal(2, occ.Count);
            Assert.Contains(occ, o => o.Label == "Closed" && o.IsAllDay && o.TimeFrom == null);
            Assert.Contains(occ, o => o.Label == "Lunch" && !o.IsAllDay && o.TimeFrom == new TimeOnly(12, 0));
        }

        [Fact]
        public async Task GetOccurrencesForRange_EmitsOnePerMatchingDate()
        {
            Seed(new TimeOff { Label = "Mon", Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, IsAllDay = true });

            // 2030-06-01 (Sat) .. 2030-06-14 (Fri) contains Mondays 3 and 10.
            var occ = await service.GetOccurrencesForRange(new DateOnly(2030, 6, 1), new DateOnly(2030, 6, 14), FacilityId);

            Assert.Equal(2, occ.Count);
            Assert.Equal(new DateOnly(2030, 6, 3), occ[0].Date);
            Assert.Equal(new DateOnly(2030, 6, 10), occ[1].Date);
        }
    }
}
