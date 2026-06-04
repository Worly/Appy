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
        Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId);
        Task Delete(int id, int facilityId);

        bool AppliesOn(TimeOff timeOff, DateOnly date);
        Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDate(DateOnly date, int facilityId);
        Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForRange(DateOnly from, DateOnly to, int facilityId);
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

        public async Task<TimeOff> AddNew(TimeOffDTO dto, int facilityId)
        {
            Validate(dto);
            var t = new TimeOff { FacilityId = facilityId };
            ApplyDto(t, dto);
            context.TimeOffs.Add(t);
            await context.SaveChangesAsync();
            return t;
        }

        public async Task<TimeOff> Edit(int id, TimeOffDTO dto, int facilityId)
        {
            Validate(dto);
            var t = await context.TimeOffs.FirstOrDefaultAsync(t => t.Id == id && t.FacilityId == facilityId);
            if (t == null)
                throw new NotFoundException();
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

        // --- Expansion (implemented in Task 5) ---
        public bool AppliesOn(TimeOff timeOff, DateOnly date) => throw new NotImplementedException();
        public Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForDate(DateOnly date, int facilityId) => throw new NotImplementedException();
        public Task<List<TimeOffOccurrenceDTO>> GetOccurrencesForRange(DateOnly from, DateOnly to, int facilityId) => throw new NotImplementedException();
    }
}
