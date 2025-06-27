using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services.SmartFiltering;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Runtime.CompilerServices;

namespace Appy.Services
{
    public interface IAppointmentService
    {
        Task<List<AppointmentViewDTO>> GetAll(DateOnly date, int facilityId, bool findPrevious, SmartFilter? filter);
        Task<List<AppointmentViewDTO>> GetList(DateOnly date, Direction direction, int skip, int take, SmartFilter? filter, int facilityId);
        Task<AppointmentViewDTO> GetById(int id, int facilityId);
        Task<AppointmentViewDTO> AddNew(AppointmentEditDTO dto, int facilityId, bool ignoreTimeNotAvailable);
        Task<AppointmentViewDTO> Edit(int id, AppointmentEditDTO dto, int facilityId, bool ignoreTimeNotAvailable);
        Task<AppointmentViewDTO> SetStatus(int id, AppointmentStatus status, int facilityId);
        Task Delete(int id, int facilityId);

        List<FreeTimeDTO> GetFreeTimes(List<AppointmentViewDTO> appointmentsOfTheDay, List<WorkingHour> workingHours, ServiceDTO service, TimeSpan duration);
        bool IsAppointmentTimeOk(List<AppointmentViewDTO> appointmentsOfTheDay, List<WorkingHour> workingHours, AppointmentEditDTO appointment);

        Task<int> GetNumberOfAppointmentsCreatedToday(int facilityId);
    }

    public class AppointmentService : IAppointmentService
    {
        private MainDbContext context;

        private IWorkingHourService workingHourService;

        public AppointmentService(MainDbContext context, IWorkingHourService workingHourService)
        {
            this.context = context;
            this.workingHourService = workingHourService;
        }

        public Task<List<AppointmentViewDTO>> GetAll(DateOnly date, int facilityId, bool findPrevious, SmartFilter? filter)
        {
            var appointments = context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .Where(s => s.FacilityId == facilityId && s.Date == date)
                .ApplySmartFilter(filter);

            if (findPrevious)
                return appointments
                    .Select(a => new
                    {
                        app = a,
                        previous = context.Appointments
                            .Include(a => a.Service)
                            .Include(a => a.Client)
                            .Where(s => s.FacilityId == a.FacilityId && s.ClientId == a.ClientId && (s.Date < a.Date || (s.Date == a.Date && s.Time < a.Time)))
                            .OrderByDescending(s => s.Date)
                            .ThenByDescending(s => s.Time)
                            .ThenByDescending(s => s.Duration)
                            .Select(a => a.ToViewDTO(null))
                            .FirstOrDefault()
                    })
                    .Select(a => a.app.ToViewDTO(a.previous))
                    .ToListAsync();
            else
                return appointments
                    .Select(a => a.ToViewDTO(null))
                    .ToListAsync();
        }

        public Task<List<AppointmentViewDTO>> GetList(DateOnly date, Direction direction, int skip, int take, SmartFilter? filter, int facilityId)
        {
            var appointments = context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .Where(s => s.FacilityId == facilityId)
                .ApplySmartFilter(filter);

            if (direction == Direction.Forwards)
                appointments = appointments.Where(s => s.Date >= date).OrderBy(s => s.Date).ThenBy(s => s.Time).ThenBy(s => s.Duration);
            else
                appointments = appointments.Where(s => s.Date < date).OrderByDescending(s => s.Date).ThenByDescending(s => s.Time).ThenByDescending(s => s.Duration);

            return appointments
                .Skip(skip)
                .Take(take)
                .Select(a => new
                {
                    app = a,
                    previous = context.Appointments
                        .Include(a => a.Service)
                        .Include(a => a.Client)
                        .Where(s => s.FacilityId == a.FacilityId && s.ClientId == a.ClientId && (s.Date < a.Date || (s.Date == a.Date && s.Time < a.Time)))
                        .OrderByDescending(s => s.Date)
                        .ThenByDescending(s => s.Time)
                        .ThenByDescending(s => s.Duration)
                        .Select(a => a.ToViewDTO(null))
                        .FirstOrDefault()
                })
                .Select(a => a.app.ToViewDTO(a.previous))
                .ToListAsync();
        }

        public async Task<AppointmentViewDTO> GetById(int id, int facilityId)
        {
            var appointment = await context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);

            if (appointment == null)
                throw new NotFoundException();

            var previous = await GetPreviousAppointment(appointment);

            return appointment.ToViewDTO(previous);
        }

        public async Task<AppointmentViewDTO> AddNew(AppointmentEditDTO dto, int facilityId, bool ignoreTimeNotAvailable)
        {
            var service = await context.Services.FirstOrDefaultAsync(s => s.Id == dto.Service.Id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException("Unknown service");

            var client = await context.Clients.FirstOrDefaultAsync(s => s.Id == dto.Client.Id && s.FacilityId == facilityId);
            if (client == null)
                throw new NotFoundException("Unknown client");

            var appointment = new Appointment()
            {
                FacilityId = facilityId,
                Date = dto.Date,
                Time = dto.Time,
                Duration = dto.Duration,
                Service = service,
                Client = client,
                Status = dto.Status,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                LastUpdatedAt = DateTime.UtcNow,
            };

            var sameDayAppointments = await GetAll(dto.Date, facilityId, findPrevious: false, filter: null);
            var workingHours = await workingHourService.GetWorkingHours(dto.Date, facilityId);
            if (!ignoreTimeNotAvailable && !IsAppointmentTimeOk(sameDayAppointments, workingHours, dto))
                throw new ValidationException(nameof(AppointmentEditDTO.Time), "pages.appointments.errors.TIME_NOT_AVAILABLE");

            context.Appointments.Add(appointment);
            await context.SaveChangesAsync();

            var previous = await GetPreviousAppointment(appointment);

            return appointment.ToViewDTO(previous);
        }

        public async Task<AppointmentViewDTO> Edit(int id, AppointmentEditDTO dto, int facilityId, bool ignoreTimeNotAvailable)
        {
            var appointment = await context.Appointments.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (appointment == null)
                throw new NotFoundException();

            var service = await context.Services.FirstOrDefaultAsync(s => s.Id == dto.Service.Id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException("Unknown service");

            var client = await context.Clients.FirstOrDefaultAsync(s => s.Id == dto.Client.Id && s.FacilityId == facilityId);
            if (client == null)
                throw new NotFoundException("Unknown client");

            if (appointment.Date != dto.Date ||
                appointment.Time != dto.Time ||
                appointment.ClientId != dto.Client.Id)
            {
                appointment.WasReminded = false;
            }

            appointment.Date = dto.Date;
            appointment.Time = dto.Time;
            appointment.Duration = dto.Duration;
            appointment.ServiceId = service.Id;
            appointment.ClientId = client.Id;
            appointment.Status = dto.Status;
            appointment.Notes = dto.Notes;
            appointment.LastUpdatedAt = DateTime.UtcNow;

            var sameDayAppointments = (await GetAll(dto.Date, facilityId, findPrevious: false, filter: null))
                .Where(a => a.Id != appointment.Id)
                .ToList();
            var workingHours = await workingHourService.GetWorkingHours(dto.Date, facilityId);
            if (!ignoreTimeNotAvailable && !IsAppointmentTimeOk(sameDayAppointments, workingHours, dto))
                throw new ValidationException(nameof(AppointmentEditDTO.Time), "pages.appointments.errors.TIME_NOT_AVAILABLE");

            await context.SaveChangesAsync();

            var previous = await GetPreviousAppointment(appointment);

            return appointment.ToViewDTO(previous);
        }

        public async Task<AppointmentViewDTO> SetStatus(int id, AppointmentStatus status, int facilityId)
        {
            var appointment = await context.Appointments.Include(a => a.Client).Include(a => a.Service)
                .FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (appointment == null)
                throw new NotFoundException();

            appointment.Status = status;
            appointment.LastUpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            var previous = await GetPreviousAppointment(appointment);

            return appointment.ToViewDTO(previous);
        }

        public async Task Delete(int id, int facilityId)
        {
            var appointments = await context.Appointments.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (appointments == null)
                throw new NotFoundException();

            context.Appointments.Remove(appointments);
            await context.SaveChangesAsync();
        }

        public List<FreeTimeDTO> GetFreeTimes(List<AppointmentViewDTO> appointmentsOfTheDay, List<WorkingHour> workingHours, ServiceDTO service, TimeSpan duration)
        {
            var result = new List<FreeTimeDTO>();

            FreeTimeDTO? currentFreeTime = null;

            var startTime = new TimeOnly(0, 0, 0);
            var endTime = new TimeOnly(23, 55, 0);

            // loop through schedule with 5 minutes increment
            TimeOnly time;
            for (time = startTime; time < endTime; time = time.AddMinutes(5))
            {
                bool ok = true;

                // if appointment exceedes midnight set ok to false
                if (time.Add(duration) < time)
                    ok = false;
                // if any two appointments overlap set ok to false
                else if (appointmentsOfTheDay.Any(app => Overlap(time, time.Add(duration), app.Time, app.Time.Add(app.Duration))))
                    ok = false;
                // if none of working hours contains the appointment set ok to false
                else if (!workingHours.Any(wh => Contains(wh.TimeFrom, wh.TimeTo, time, time.Add(duration))))
                    ok = false;

                // if current time is ok and currentFreeTime has not begun, then start it
                if (ok && currentFreeTime == null)
                {
                    currentFreeTime = new FreeTimeDTO()
                    {
                        From = time
                    };
                }
                // else if current time is not ok and there is currentFreeTime begun, then end it and add it to results
                else if (!ok && currentFreeTime != null)
                {
                    currentFreeTime.To = time.AddMinutes(-5);
                    currentFreeTime.ToIncludingDuration = currentFreeTime.To.Add(duration);
                    result.Add(currentFreeTime);
                    currentFreeTime = null;
                }
            }

            // check one last time if its available in the last slot of the day
            if (currentFreeTime != null)
            {
                currentFreeTime.To = time.AddMinutes(-5);
                currentFreeTime.ToIncludingDuration = currentFreeTime.To.Add(duration);
                result.Add(currentFreeTime);
                currentFreeTime = null;
            }

            return result;
        }

        public bool IsAppointmentTimeOk(List<AppointmentViewDTO> appointmentsOfTheDay, List<WorkingHour> workingHours, AppointmentEditDTO appointment)
        {
            var freeTimes = GetFreeTimes(appointmentsOfTheDay, workingHours, appointment.Service, appointment.Duration);

            foreach (var freeTime in freeTimes)
            {
                if (appointment.Time >= freeTime.From && appointment.Time <= freeTime.To)
                    return true;
            }

            return false;
        }

        public async Task<int> GetNumberOfAppointmentsCreatedToday(int facilityId)
        {
            return await context.Appointments.Where(a => a.CreatedAt.Date == DateTime.UtcNow.Date).CountAsync();
        }

        private bool Overlap(TimeOnly startA, TimeOnly endA, TimeOnly startB, TimeOnly endB)
        {
            return startA < endB && endA > startB;
        }

        private bool Contains(TimeOnly startOuter, TimeOnly endOuter, TimeOnly startInner, TimeOnly endInner)
        {
            return startOuter <= startInner && endOuter >= endInner;
        }

        private Task<AppointmentViewDTO?> GetPreviousAppointment(Appointment a)
        {
            return context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .Where(s => s.FacilityId == a.FacilityId && s.ClientId == a.ClientId && (s.Date < a.Date || (s.Date == a.Date && s.Time < a.Time)))
                .OrderByDescending(s => s.Date)
                .ThenByDescending(s => s.Time)
                .ThenByDescending(s => s.Duration)
                .Select(a => a.ToViewDTO(null))
                .FirstOrDefaultAsync();
        }
    }
}
