using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface ITimeOffService
    {
        Task<List<TimeOff>> GetAll(int facilityId);
        Task<TimeOff> GetById(int id, int facilityId);
        Task<TimeOff> AddNew(TimeOffDTO dto, int facilityId);
        Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId, DateOnly? applyFrom = null);
        Task Delete(int id, int facilityId);
        Task<TimeOff> StopRecurring(int id, int facilityId);

        bool AppliesOn(TimeOff timeOff, DateOnly date);
        Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDate(DateOnly date, int facilityId);
        Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDates(IEnumerable<DateOnly> dates, int facilityId);
        Task<List<TimeOffDTO>> GetList(TimeOffListType type, TimeOffScope scope, int skip, int take, int facilityId);
    }

    public class TimeOffService : ITimeOffService
    {
        private MainDbContext context;

        public TimeOffService(MainDbContext context)
        {
            this.context = context;
        }

        public Task<List<TimeOff>> GetAll(int facilityId)
            => context.TimeOffs.Where(t => t.FacilityId == facilityId).ToListAsync();

        public async Task<TimeOff> GetById(int id, int facilityId)
        {
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
            return t;
        }

        public async Task<List<TimeOffDTO>> GetList(TimeOffListType type, TimeOffScope scope, int skip, int take, int facilityId)
        {
            var all = await GetAll(facilityId);
            var today = DateOnly.FromDateTime(DateTime.Today);
            return BuildListPage(all, type, scope, today, skip, take).Select(t => t.GetDTO()).ToList();
        }

        public async Task<TimeOff> AddNew(TimeOffDTO dto, int facilityId)
        {
            Validate(dto);
            var t = new TimeOff { FacilityId = facilityId };
            ApplyDto(t, dto);
            // A new recurring rule with no explicit start is "from today, forever" — stamp today so the
            // rule has a concrete effective-from (one-offs always carry their own dates).
            if (t.Recurrence != TimeOffRecurrence.OneOff && t.StartDate == null)
                t.StartDate = DateOnly.FromDateTime(DateTime.Today);
            context.TimeOffs.Add(t);
            await context.SaveChangesAsync();
            return t;
        }

        public async Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId, DateOnly? applyFrom = null)
        {
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();

            // A recurring rule is a timeline of segments. Editing with an applyFrom date that lands
            // strictly after the rule's current effective start forks the timeline: the original keeps
            // its old values and ends the day before applyFrom; a new segment carries the edits from
            // applyFrom onward. Otherwise (absent date, on/before the start, or a one-off) there's
            // nothing to preserve — edit in place.
            bool split = applyFrom.HasValue
                && t.Recurrence != TimeOffRecurrence.OneOff
                && (t.StartDate == null || applyFrom.Value > t.StartDate.Value);

            Validate(dto);

            if (split)
            {
                // The new segment's effective start is applyFrom — it overrides any form "From",
                // so guard the real bound here: an end before applyFrom is "dates not in order".
                if (dto.EndDate != null && applyFrom!.Value > dto.EndDate.Value)
                    throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.DATES_NOT_IN_ORDER");

                var newSegment = new TimeOff { FacilityId = facilityId };
                ApplyDto(newSegment, dto);
                newSegment.StartDate = applyFrom!.Value;   // applyFrom is the new segment's effective start
                t.EndDate = applyFrom!.Value.AddDays(-1);  // original becomes the historical segment
                context.TimeOffs.Add(newSegment);
                await context.SaveChangesAsync();
                return newSegment;
            }

            ApplyDto(t, dto);
            await context.SaveChangesAsync();
            return t;
        }

        public async Task Delete(int id, int facilityId)
        {
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
            context.TimeOffs.Remove(t);
            await context.SaveChangesAsync();
        }

        // "Stop" a recurring rule going forward: clamp its end to yesterday so past occurrences
        // remain as history but it no longer applies from today on. Mirrors the EndDate clamp the
        // edit-fork applies to the historical segment. No-op (and no save) if the rule already ends
        // on or before yesterday, so stopping never extends an expired rule's end forward.
        public async Task<TimeOff> StopRecurring(int id, int facilityId)
        {
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
            if (t.Recurrence == TimeOffRecurrence.OneOff)
                throw new ValidationException(nameof(TimeOffDTO.Recurrence), "pages.time-off.errors.CANNOT_STOP_ONE_OFF");

            var yesterday = DateOnly.FromDateTime(DateTime.Today).AddDays(-1);
            if (t.EndDate == null || t.EndDate.Value > yesterday)
            {
                t.EndDate = yesterday;
                await context.SaveChangesAsync();
            }
            return t;
        }

        private void Validate(TimeOffDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Label))
                throw new ValidationException(nameof(TimeOffDTO.Label), "pages.time-off.errors.MISSING_LABEL");

            if (!dto.IsAllDay)
            {
                if (dto.TimeFrom == null || dto.TimeTo == null)
                    throw new ValidationException(nameof(TimeOffDTO.TimeFrom), "pages.time-off.errors.MISSING_TIME");
                if (dto.TimeFrom >= dto.TimeTo)
                    throw new ValidationException(nameof(TimeOffDTO.TimeFrom), "pages.time-off.errors.TIMES_NOT_IN_ORDER");
            }

            switch (dto.Recurrence)
            {
                case TimeOffRecurrence.OneOff:
                    if (dto.StartDate == null || dto.EndDate == null)
                        throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.MISSING_DATE_RANGE");
                    if (dto.StartDate > dto.EndDate)
                        throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.DATES_NOT_IN_ORDER");
                    break;
                case TimeOffRecurrence.Weekly:
                    if (dto.DayOfWeek == null)
                        throw new ValidationException(nameof(TimeOffDTO.DayOfWeek), "pages.time-off.errors.MISSING_DAY_OF_WEEK");
                    if (dto.StartDate != null && dto.EndDate != null && dto.StartDate > dto.EndDate)
                        throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.DATES_NOT_IN_ORDER");
                    break;
                case TimeOffRecurrence.Monthly:
                    if (dto.DayOfMonth == null || dto.DayOfMonth < 1 || dto.DayOfMonth > 31)
                        throw new ValidationException(nameof(TimeOffDTO.DayOfMonth), "pages.time-off.errors.INVALID_DAY_OF_MONTH");
                    if (dto.StartDate != null && dto.EndDate != null && dto.StartDate > dto.EndDate)
                        throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.DATES_NOT_IN_ORDER");
                    break;
            }
        }

        // Normalizes the entity: fields irrelevant to the chosen recurrence / all-day are nulled.
        private void ApplyDto(TimeOff t, TimeOffDTO dto)
        {
            t.Label = dto.Label;
            t.Notes = dto.Notes;
            t.Recurrence = dto.Recurrence;
            t.StartDate = dto.StartDate;
            t.EndDate = dto.EndDate;
            t.DayOfWeek = dto.Recurrence == TimeOffRecurrence.Weekly ? dto.DayOfWeek : null;
            t.DayOfMonth = dto.Recurrence == TimeOffRecurrence.Monthly ? dto.DayOfMonth : null;
            t.IsAllDay = dto.IsAllDay;
            t.TimeFrom = dto.IsAllDay ? null : dto.TimeFrom;
            t.TimeTo = dto.IsAllDay ? null : dto.TimeTo;
        }

        // The first date on/after `from` that this rule applies on, honouring its bounds.
        // Returns null when the rule has no occurrence in range (e.g. a weekly day that lands past EndDate,
        // or a day-of-month the calendar skips within a year). Used as a sort key for Recurring/Active.
        public static DateOnly? NextOccurrenceOnOrAfter(TimeOff t, DateOnly from)
        {
            var anchor = (t.StartDate.HasValue && t.StartDate.Value > from) ? t.StartDate.Value : from;

            switch (t.Recurrence)
            {
                case TimeOffRecurrence.OneOff:
                    if (t.EndDate == null) return null;
                    return anchor <= t.EndDate.Value ? anchor : (DateOnly?)null;

                case TimeOffRecurrence.Weekly:
                    if (t.DayOfWeek == null) return null;
                    var delta = ((int)t.DayOfWeek.Value - (int)anchor.DayOfWeek + 7) % 7;
                    var wd = anchor.AddDays(delta);
                    return (t.EndDate == null || wd <= t.EndDate.Value) ? wd : (DateOnly?)null;

                case TimeOffRecurrence.Monthly:
                    if (t.DayOfMonth == null) return null;
                    for (var d = anchor; d <= anchor.AddDays(366); d = d.AddDays(1))
                    {
                        if (t.EndDate != null && d > t.EndDate.Value) return null;
                        if (d.Day == t.DayOfMonth.Value) return d;
                    }
                    return null;

                default:
                    return null;
            }
        }

        // Filters a facility's rules to one tab (type) and scope, orders them, and pages.
        // Active = today/future or open-ended; Expired = ended before today. Pure — `today` is injected.
        public static List<TimeOff> BuildListPage(IEnumerable<TimeOff> all, TimeOffListType type, TimeOffScope scope, DateOnly today, int skip, int take)
        {
            var typed = type == TimeOffListType.OneOff
                ? all.Where(t => t.Recurrence == TimeOffRecurrence.OneOff)
                : all.Where(t => t.Recurrence != TimeOffRecurrence.OneOff);

            // OneOff always has EndDate; recurring may be open-ended (null EndDate = never expires).
            var scoped = scope == TimeOffScope.Active
                ? typed.Where(t => t.EndDate == null || t.EndDate.Value >= today)
                : typed.Where(t => t.EndDate != null && t.EndDate.Value < today);

            IEnumerable<TimeOff> ordered;
            if (scope == TimeOffScope.Expired)
            {
                ordered = scoped.OrderByDescending(t => t.EndDate).ThenByDescending(t => t.Id); // newest-ended first
            }
            else if (type == TimeOffListType.OneOff)
            {
                ordered = scoped.OrderBy(t => t.StartDate).ThenBy(t => t.EndDate).ThenBy(t => t.Id); // ongoing float up
            }
            else
            {
                // Recurring/Active: sort by next occurrence; rules with none (sort key null) go last.
                ordered = scoped
                    .Select(t => new { t, next = NextOccurrenceOnOrAfter(t, today) })
                    .OrderBy(x => x.next.HasValue ? 0 : 1)
                    .ThenBy(x => x.next)
                    .ThenBy(x => x.t.Id)
                    .Select(x => x.t);
            }

            return ordered.Skip(skip).Take(take).ToList();
        }

        public bool AppliesOn(TimeOff t, DateOnly date)
        {
            switch (t.Recurrence)
            {
                case TimeOffRecurrence.OneOff:
                    return t.StartDate <= date && date <= t.EndDate;
                case TimeOffRecurrence.Weekly:
                    return t.DayOfWeek == date.DayOfWeek
                        && (t.StartDate == null || date >= t.StartDate)
                        && (t.EndDate == null || date <= t.EndDate);
                case TimeOffRecurrence.Monthly:
                    return t.DayOfMonth == date.Day
                        && (t.StartDate == null || date >= t.StartDate)
                        && (t.EndDate == null || date <= t.EndDate);
                default:
                    return false;
            }
        }

        public async Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDate(DateOnly date, int facilityId)
        {
            var all = await GetAll(facilityId);
            return all.Where(t => AppliesOn(t, date)).Select(t => ToOccurrence(t, date)).ToList();
        }

        // Expands rules to occurrences only on the given dates (deduped, date-ordered). Callers pass the
        // dates they actually render — e.g. the dates that have appointments on a list page — so this is
        // O(dates × rules) instead of scanning every day in a potentially huge min..max span.
        public async Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDates(IEnumerable<DateOnly> dates, int facilityId)
        {
            var distinct = dates.Distinct().OrderBy(d => d).ToList();
            if (distinct.Count == 0)
                return new List<TimeOffOccurrenceDTO>();

            var all = await GetAll(facilityId);
            var result = new List<TimeOffOccurrenceDTO>();
            foreach (var d in distinct)
                result.AddRange(all.Where(t => AppliesOn(t, d)).Select(t => ToOccurrence(t, d)));
            return result;
        }

        private static TimeOffOccurrenceDTO ToOccurrence(TimeOff t, DateOnly date) => new()
        {
            Id = t.Id,
            Date = date,
            Label = t.Label,
            Notes = t.Notes,
            IsAllDay = t.IsAllDay,
            TimeFrom = t.IsAllDay ? null : t.TimeFrom,
            TimeTo = t.IsAllDay ? null : t.TimeTo,
        };
    }
}
