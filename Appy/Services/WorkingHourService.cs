using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IWorkingHourService
    {
        Task<List<WorkingHour>> GetAll(int facilityId);
        Task<List<WorkingHour>> GetWorkingHours(DateOnly date, int facilityId);

        Task SetWorkingHours(List<WorkingHourDTO> workingHours, int facilityId);
    }

    public class WorkingHourService : IWorkingHourService
    {
        private MainDbContext context;

        public WorkingHourService(MainDbContext context)
        {
            this.context = context;
        }

        public Task<List<WorkingHour>> GetAll(int facilityId)
        {
            return context.WorkingHours.Where(w => w.FacilityId == facilityId).ToListAsync();
        }

        public Task<List<WorkingHour>> GetWorkingHours(DateOnly date, int facilityId)
        {
            return context.WorkingHours.Where(w => w.FacilityId == facilityId && w.DayOfWeek == date.DayOfWeek).ToListAsync();
        }

        public Task SetWorkingHours(List<WorkingHourDTO> workingHours, int facilityId)
        {
            if (workingHours.Any(w => w.TimeFrom >= w.TimeTo))
                throw new ValidationException("pages.working-hours.errors.TIMES_NOT_IN_ORDER");

            for (int day = 0; day < 7; day++)
            {
                var dayWorkingHours = workingHours.Where(d => (int)d.DayOfWeek == day).ToList();
                for (int i = 0; i < dayWorkingHours.Count; i++)
                {
                    for (int j = i + 1; j < dayWorkingHours.Count; j++)
                    {
                        var w1 = dayWorkingHours[i];
                        var w2 = dayWorkingHours[j];
                        if (w1.TimeFrom <= w2.TimeTo && w1.TimeTo >= w2.TimeFrom)
                            throw new ValidationException("pages.working-hours.errors.TIMES_OVERLAP");
                    }
                }
            }

            var entites = workingHours.Select(w => new WorkingHour()
            {
                FacilityId = facilityId,
                DayOfWeek = w.DayOfWeek,
                TimeFrom = w.TimeFrom,
                TimeTo = w.TimeTo
            });

            context.WorkingHours.RemoveRange(context.WorkingHours.Where(w => w.FacilityId == facilityId));

            context.WorkingHours.AddRange(entites);
            return context.SaveChangesAsync();
        }
    }
}
