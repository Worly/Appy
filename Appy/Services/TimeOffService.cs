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
        private readonly ILogger<TimeOffService> logger;

        public TimeOffService(MainDbContext context, ILogger<TimeOffService> logger)
        {
            this.context = context;
            this.logger = logger;
        }

        public Task<List<TimeOff>> GetAll(int facilityId)
            => context.TimeOffs.Where(t => t.FacilityId == facilityId).ToListAsync();

        public async Task<TimeOff> GetById(int id, int facilityId)
        {
            var t = await context.TimeOffs
                .Include(t => t.ImportedHoliday)
                .FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
            return t;
        }

        public async Task<List<TimeOffDTO>> GetList(TimeOffListType type, TimeOffScope scope, int skip, int take, int facilityId)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);

            // Filter to the requested tab + scope on the DB so we never load the whole table.
            // Imported holidays live on the dedicated Holidays tab, so they never surface here.
            var query = context.TimeOffs.Where(t => t.FacilityId == facilityId && t.ImportedHolidayId == null);
            query = type == TimeOffListType.OneOff
                ? query.Where(t => t.Recurrence == TimeOffRecurrence.OneOff)
                : query.Where(t => t.Recurrence != TimeOffRecurrence.OneOff);
            query = scope == TimeOffScope.Active
                ? query.Where(t => t.EndDate == null || t.EndDate >= today)   // open-ended or not-yet-ended
                : query.Where(t => t.EndDate != null && t.EndDate < today);   // ended before today

            List<TimeOff> page;
            if (scope == TimeOffScope.History)
            {
                // Newest-ended first — ordered and paged entirely on the DB.
                page = await query
                    .OrderByDescending(t => t.EndDate).ThenByDescending(t => t.Id)
                    .Skip(skip).Take(take).ToListAsync();
            }
            else if (type == TimeOffListType.OneOff)
            {
                // Ongoing/earliest-start first — ordered and paged entirely on the DB.
                page = await query
                    .OrderBy(t => t.StartDate).ThenBy(t => t.EndDate).ThenBy(t => t.Id)
                    .Skip(skip).Take(take).ToListAsync();
            }
            else
            {
                // Recurring/Active orders by each rule's next occurrence — recurrence math the DB
                // can't express — so order and page the (bounded) active-recurring set in memory.
                var active = await query.ToListAsync();
                page = OrderRecurringByNextOccurrence(active, today).Skip(skip).Take(take).ToList();
            }

            return page.Select(t => t.GetDTO()).ToList();
        }

        public async Task<TimeOff> AddNew(TimeOffDTO dto, int facilityId)
        {
            Validate(dto);
            var t = new TimeOff { FacilityId = facilityId };
            ApplyDto(t, dto);
            context.TimeOffs.Add(t);
            await context.SaveChangesAsync();
            logger.LogInformation("TimeOff {TimeOffId} created (facilityId {FacilityId})", t.Id, facilityId);
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
                && applyFrom.Value > t.StartDate;

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
                logger.LogInformation("TimeOff {TimeOffId} forked at {ApplyFrom}: new segment {NewSegmentId} (facilityId {FacilityId})", t.Id, applyFrom!.Value, newSegment.Id, facilityId);
                return newSegment;
            }

            ApplyDto(t, dto);
            await context.SaveChangesAsync();
            logger.LogInformation("TimeOff {TimeOffId} updated (facilityId {FacilityId})", t.Id, facilityId);
            return t;
        }

        public async Task Delete(int id, int facilityId)
        {
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
            context.TimeOffs.Remove(t);
            await context.SaveChangesAsync();
            logger.LogInformation("TimeOff {TimeOffId} deleted (facilityId {FacilityId})", id, facilityId);
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
                logger.LogInformation("TimeOff {TimeOffId} stopped: end clamped to {EndDate} (facilityId {FacilityId})", t.Id, yesterday, facilityId);
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

            // Effective-from is mandatory for every recurrence — never optional.
            if (dto.StartDate == null)
                throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.MISSING_START_DATE");

            if (dto.EndDate != null && dto.StartDate > dto.EndDate)
                throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.DATES_NOT_IN_ORDER");

            switch (dto.Recurrence)
            {
                case TimeOffRecurrence.OneOff:
                    if (dto.EndDate == null)
                        throw new ValidationException(nameof(TimeOffDTO.StartDate), "pages.time-off.errors.MISSING_DATE_RANGE");
                    break;
                case TimeOffRecurrence.Weekly:
                    if (dto.DayOfWeek == null)
                        throw new ValidationException(nameof(TimeOffDTO.DayOfWeek), "pages.time-off.errors.MISSING_DAY_OF_WEEK");
                    break;
                case TimeOffRecurrence.Monthly:
                    if (dto.DayOfMonth == null || dto.DayOfMonth < 1 || dto.DayOfMonth > 31)
                        throw new ValidationException(nameof(TimeOffDTO.DayOfMonth), "pages.time-off.errors.INVALID_DAY_OF_MONTH");
                    break;
            }
        }

        // Normalizes the entity: fields irrelevant to the chosen recurrence / all-day are nulled.
        private void ApplyDto(TimeOff t, TimeOffDTO dto)
        {
            t.Label = dto.Label;
            t.Notes = dto.Notes;
            t.Recurrence = dto.Recurrence;
            t.StartDate = dto.StartDate!.Value;   // required — guaranteed non-null by Validate
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
            var anchor = t.StartDate > from ? t.StartDate : from;

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

        // Recurring/Active sort key: the next occurrence on/after today; rules with none (key null)
        // go last. Pure and in-memory — the recurrence math has no SQL translation. `today` is injected.
        public static List<TimeOff> OrderRecurringByNextOccurrence(IEnumerable<TimeOff> rules, DateOnly today)
            => rules
                .Select(t => new { t, next = NextOccurrenceOnOrAfter(t, today) })
                .OrderBy(x => x.next.HasValue ? 0 : 1)
                .ThenBy(x => x.next)
                .ThenBy(x => x.t.Id)
                .Select(x => x.t)
                .ToList();

        public bool AppliesOn(TimeOff t, DateOnly date)
        {
            switch (t.Recurrence)
            {
                case TimeOffRecurrence.OneOff:
                    return t.StartDate <= date && date <= t.EndDate;
                case TimeOffRecurrence.Weekly:
                    return t.DayOfWeek == date.DayOfWeek
                        && date >= t.StartDate
                        && (t.EndDate == null || date <= t.EndDate);
                case TimeOffRecurrence.Monthly:
                    return t.DayOfMonth == date.Day
                        && date >= t.StartDate
                        && (t.EndDate == null || date <= t.EndDate);
                default:
                    return false;
            }
        }

        public async Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDate(DateOnly date, int facilityId)
        {
            // AppliesOn for a fixed date is fully expressible in SQL (the weekday / month-day are
            // constants), so the DB returns only the rules that fire on this date.
            var dayOfWeek = date.DayOfWeek;
            var dayOfMonth = date.Day;

            var matching = await context.TimeOffs
                .Where(t => t.FacilityId == facilityId && (
                    (t.Recurrence == TimeOffRecurrence.OneOff && t.StartDate <= date && date <= t.EndDate)
                    || (t.Recurrence == TimeOffRecurrence.Weekly && t.DayOfWeek == dayOfWeek && date >= t.StartDate && (t.EndDate == null || date <= t.EndDate))
                    || (t.Recurrence == TimeOffRecurrence.Monthly && t.DayOfMonth == dayOfMonth && date >= t.StartDate && (t.EndDate == null || date <= t.EndDate))
                ))
                .ToListAsync();

            return matching.Select(t => ToOccurrence(t, date)).ToList();
        }

        // Expands rules to occurrences only on the given dates (deduped, date-ordered). Callers pass the
        // dates they actually render — e.g. the dates that have appointments on a list page. The DB
        // pre-filters to candidate rules (effective span overlaps the requested range and, for recurring,
        // the weekday / month-day matches one that's requested); the exact per-date expansion is then done
        // in memory over that small candidate set rather than scanning the whole table.
        public async Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDates(IEnumerable<DateOnly> dates, int facilityId)
        {
            var distinct = dates.Distinct().OrderBy(d => d).ToList();
            if (distinct.Count == 0)
                return new List<TimeOffOccurrenceDTO>();

            var min = distinct[0];
            var max = distinct[^1];
            var daysOfWeek = distinct.Select(d => d.DayOfWeek).Distinct().ToList();
            var daysOfMonth = distinct.Select(d => d.Day).Distinct().ToList();

            var candidates = await context.TimeOffs
                .Where(t => t.FacilityId == facilityId
                    && t.StartDate <= max
                    && (t.EndDate == null || t.EndDate >= min)
                    && (
                        t.Recurrence == TimeOffRecurrence.OneOff
                        || (t.Recurrence == TimeOffRecurrence.Weekly && t.DayOfWeek != null && daysOfWeek.Contains(t.DayOfWeek.Value))
                        || (t.Recurrence == TimeOffRecurrence.Monthly && t.DayOfMonth != null && daysOfMonth.Contains(t.DayOfMonth.Value))
                    ))
                .ToListAsync();

            var result = new List<TimeOffOccurrenceDTO>();
            foreach (var d in distinct)
                result.AddRange(candidates.Where(t => AppliesOn(t, d)).Select(t => ToOccurrence(t, d)));
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
