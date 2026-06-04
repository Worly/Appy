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
    }
}
