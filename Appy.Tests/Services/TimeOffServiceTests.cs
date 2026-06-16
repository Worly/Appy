using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services;
using Moq;
using Moq.EntityFrameworkCore;
using System.Linq;

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

        [Fact]
        public async Task GetOccurrencesForRange_SetsOccurrenceIdToRuleId()
        {
            timeOffs.Add(new TimeOff
            {
                Id = 42,
                FacilityId = FacilityId,
                Label = "Vacation",
                Recurrence = TimeOffRecurrence.OneOff,
                StartDate = new DateOnly(2030, 6, 1),
                EndDate = new DateOnly(2030, 6, 5),
                IsAllDay = true,
            });

            var result = await service.GetOccurrencesForRange(new DateOnly(2030, 6, 1), new DateOnly(2030, 6, 1), FacilityId);

            Assert.Single(result);
            Assert.Equal(42, result[0].Id);
        }

        // ---- NextOccurrenceOnOrAfter ----

        [Fact]
        public void NextOccurrence_Weekly_ReturnsSameWeekMatch()
        {
            var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Wednesday };
            // 2030-06-03 is a Monday; next Wednesday is 2030-06-05.
            var next = TimeOffService.NextOccurrenceOnOrAfter(t, new DateOnly(2030, 6, 3));
            Assert.Equal(new DateOnly(2030, 6, 5), next);
        }

        [Fact]
        public void NextOccurrence_Weekly_NullWhenNextLandsPastEndDate()
        {
            // Monday rule, "from" is a Tuesday, end date is this Friday — next Monday is after the end.
            var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, EndDate = new DateOnly(2030, 6, 7) };
            var next = TimeOffService.NextOccurrenceOnOrAfter(t, new DateOnly(2030, 6, 4)); // Tuesday
            Assert.Null(next);
        }

        [Fact]
        public void NextOccurrence_Monthly_SkipsShortMonths()
        {
            // Day 31 rule from 2030-02-01: Feb/Apr have no 31st; next 31st is 2030-03-31.
            var t = new TimeOff { Recurrence = TimeOffRecurrence.Monthly, DayOfMonth = 31 };
            var next = TimeOffService.NextOccurrenceOnOrAfter(t, new DateOnly(2030, 2, 1));
            Assert.Equal(new DateOnly(2030, 3, 31), next);
        }

        [Fact]
        public void NextOccurrence_RespectsFutureStartDate()
        {
            var t = new TimeOff { Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Monday, StartDate = new DateOnly(2030, 7, 1) };
            // Asking from June returns the first Monday on/after the July start (2030-07-01 is a Monday).
            var next = TimeOffService.NextOccurrenceOnOrAfter(t, new DateOnly(2030, 6, 1));
            Assert.Equal(new DateOnly(2030, 7, 1), next);
        }

        // ---- BuildListPage ----

        private static readonly DateOnly Today = new DateOnly(2030, 6, 10); // a Monday

        [Fact]
        public void BuildListPage_OneOffActive_ExcludesExpiredAndSortsByStartDate()
        {
            var ongoing = new TimeOff { Id = 1, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 6, 1), EndDate = new DateOnly(2030, 6, 20) };
            var future = new TimeOff { Id = 2, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 7, 1), EndDate = new DateOnly(2030, 7, 5) };
            var past = new TimeOff { Id = 3, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 5, 1), EndDate = new DateOnly(2030, 5, 9) };

            var page = TimeOffService.BuildListPage(new[] { future, past, ongoing }, TimeOffListType.OneOff, TimeOffScope.Active, Today, 0, 20);

            Assert.Equal(new[] { 1, 2 }, page.Select(t => t.Id).ToArray()); // ongoing (earlier start) first, past excluded
        }

        [Fact]
        public void BuildListPage_OneOffExpired_NewestEndedFirst()
        {
            var a = new TimeOff { Id = 1, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 5, 1), EndDate = new DateOnly(2030, 5, 3) };
            var b = new TimeOff { Id = 2, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 6, 1), EndDate = new DateOnly(2030, 6, 8) };

            var page = TimeOffService.BuildListPage(new[] { a, b }, TimeOffListType.OneOff, TimeOffScope.Expired, Today, 0, 20);

            Assert.Equal(new[] { 2, 1 }, page.Select(t => t.Id).ToArray()); // b ended later -> first
        }

        [Fact]
        public void BuildListPage_RecurringActive_SortsByNextOccurrence_NoOccurrenceLast()
        {
            var weds = new TimeOff { Id = 1, Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Wednesday }; // next 2030-06-12
            var tue = new TimeOff { Id = 2, Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Tuesday };   // next 2030-06-11
            // Non-expired by bounds (end in the future) but no remaining occurrence: Sunday rule ending Wed.
            var dead = new TimeOff { Id = 3, Recurrence = TimeOffRecurrence.Weekly, DayOfWeek = DayOfWeek.Sunday, EndDate = new DateOnly(2030, 6, 12) };

            var page = TimeOffService.BuildListPage(new[] { weds, dead, tue }, TimeOffListType.Recurring, TimeOffScope.Active, Today, 0, 20);

            Assert.Equal(new[] { 2, 1, 3 }, page.Select(t => t.Id).ToArray()); // Tue, Wed, then the no-occurrence rule last
        }

        [Fact]
        public void BuildListPage_RecurringActive_IncludesOpenEnded_ExcludesOneOffs()
        {
            var openEnded = new TimeOff { Id = 1, Recurrence = TimeOffRecurrence.Monthly, DayOfMonth = 15 };
            var oneOff = new TimeOff { Id = 2, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 6, 1), EndDate = new DateOnly(2030, 6, 30) };

            var page = TimeOffService.BuildListPage(new[] { openEnded, oneOff }, TimeOffListType.Recurring, TimeOffScope.Active, Today, 0, 20);

            Assert.Equal(new[] { 1 }, page.Select(t => t.Id).ToArray()); // one-off excluded from Recurring
        }

        [Fact]
        public void BuildListPage_AppliesSkipAndTake()
        {
            var items = Enumerable.Range(1, 5).Select(i =>
                new TimeOff { Id = i, Recurrence = TimeOffRecurrence.OneOff, StartDate = new DateOnly(2030, 6, i), EndDate = new DateOnly(2030, 7, i) }).ToArray();

            var page = TimeOffService.BuildListPage(items, TimeOffListType.OneOff, TimeOffScope.Active, Today, 2, 2);

            Assert.Equal(new[] { 3, 4 }, page.Select(t => t.Id).ToArray());
        }
    }
}
