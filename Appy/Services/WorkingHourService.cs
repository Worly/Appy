using Appy.Contracts;
using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public class WorkingHourService : IWorkingHourService
    {
        private MainDbContext context;
        private readonly IMapper _mapper;

        public WorkingHourService(MainDbContext context, IMapper mapper)
        {
            this.context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<WorkingHourDTO>> GetAll(int facilityId)
        {
            var workingHours = await context.WorkingHours.Where(w => w.FacilityId == facilityId).ToListAsync();

            return workingHours.Select(x => new WorkingHourDTO
            {
                DayOfWeek = x.DayOfWeek,
                TimeFrom = x.TimeFrom,
                TimeTo = x.TimeTo
            });
        }

        public async Task<IEnumerable<WorkingHourDTO>> GetWorkingHours(DateOnly date, int facilityId)
        {
            var workingHours = await context.WorkingHours.Where(w => w.FacilityId == facilityId && w.DayOfWeek == date.DayOfWeek).ToListAsync();
            return workingHours.Select(x=> new WorkingHourDTO { 
                    DayOfWeek = x.DayOfWeek,
                    TimeFrom = x.TimeFrom,
                    TimeTo = x.TimeTo
            });
        }

        public Task SetWorkingHours(IEnumerable<WorkingHourDTO> workingHourDtos, int facilityId)
        {
            if (workingHourDtos.Any(w => w.TimeFrom >= w.TimeTo))
            {
                throw new ValidationException("pages.working-hours.errors.TIMES_NOT_IN_ORDER");
            }

            for (int day = 0; day < 7; day++)
            {
                var dayWorkingHours = workingHourDtos.Where(d => (int)d.DayOfWeek == day).ToList();
                for (int i = 0; i < dayWorkingHours.Count; i++)
                {
                    for (int j = i + 1; j < dayWorkingHours.Count; j++)
                    {
                        var workingHour1 = dayWorkingHours[i];
                        var workingHour2 = dayWorkingHours[j];
                        if (workingHour1.TimeFrom <= workingHour2.TimeTo && workingHour1.TimeTo >= workingHour2.TimeFrom)
                        {
                            throw new ValidationException("pages.working-hours.errors.TIMES_OVERLAP");
                        }
                    }
                }
            }

            var workingHours = workingHourDtos.Select(w => WorkingHour.Create(facilityId, w.DayOfWeek, w.TimeFrom, w.TimeTo));
            context.WorkingHours.RemoveRange(context.WorkingHours.Where(w => w.FacilityId == facilityId));
            context.WorkingHours.AddRange(workingHours);
            return context.SaveChangesAsync();
        }
    }
}
