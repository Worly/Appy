using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IAppointmentService
    {
        Task<List<Appointment>> GetAll(DateOnly date, int facilityId);
        Task<List<Appointment>> GetList(DateOnly date, Direction direction, int skip, int take, int facilityId);
        Task<Appointment> GetById(int id, int facilityId);
        Task<Appointment> AddNew(AppointmentDTO dto, int facilityId, bool ignoreTimeNotAvailable);
        Task<Appointment> Edit(int id, AppointmentDTO dto, int facilityId, bool ignoreTimeNotAvailable);
        Task Delete(int id, int facilityId);

        List<FreeTimeDTO> GetFreeTimes(List<Appointment> appointmentsOfTheDay, List<WorkingHour> workingHours, Service service, TimeSpan duration);
        bool IsAppointmentTimeOk(List<Appointment> appointmentsOfTheDay, List<WorkingHour> workingHours, Appointment appointment);
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

        public Task<List<Appointment>> GetAll(DateOnly date, int facilityId)
        {
            return context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .Where(s => s.FacilityId == facilityId && s.Date == date)
                .ToListAsync();
        }

        public Task<List<Appointment>> GetList(DateOnly date, Direction direction, int skip, int take, int facilityId)
        {
            var appointments = context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .Where(s => s.FacilityId == facilityId);

            if (direction == Direction.Forwards)
                appointments = appointments.Where(s => s.Date >= date).OrderBy(s => s.Date).ThenBy(s => s.Time).ThenBy(s => s.Duration);
            else
                appointments = appointments.Where(s => s.Date < date).OrderByDescending(s => s.Date).ThenByDescending(s => s.Time).ThenByDescending(s => s.Duration);

            return appointments.Skip(skip).Take(take).ToListAsync();
        }

        public async Task<Appointment> GetById(int id, int facilityId)
        {
            var appointment = await context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);

            if (appointment == null)
                throw new NotFoundException();

            return appointment;
        }

        public async Task<Appointment> AddNew(AppointmentDTO dto, int facilityId, bool ignoreTimeNotAvailable)
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
                Client = client
            };

            var sameDayAppointments = await GetAll(dto.Date, facilityId);
            var workingHours = await workingHourService.GetWorkingHours(dto.Date, facilityId);
            if (!ignoreTimeNotAvailable && !IsAppointmentTimeOk(sameDayAppointments, workingHours, appointment))
                throw new ValidationException(nameof(AppointmentDTO.Time), "pages.appointments.errors.TIME_NOT_AVAILABLE");

            context.Appointments.Add(appointment);
            await context.SaveChangesAsync();

            return appointment;
        }

        public async Task<Appointment> Edit(int id, AppointmentDTO dto, int facilityId, bool ignoreTimeNotAvailable)
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

            appointment.Date = dto.Date;
            appointment.Time = dto.Time;
            appointment.Duration = dto.Duration;
            appointment.ServiceId = service.Id;
            appointment.ClientId = client.Id;

            var sameDayAppointments = (await GetAll(dto.Date, facilityId)).Where(a => a.Id != appointment.Id).ToList();
            var workingHours = await workingHourService.GetWorkingHours(dto.Date, facilityId);
            if (!ignoreTimeNotAvailable && !IsAppointmentTimeOk(sameDayAppointments, workingHours, appointment))
                throw new ValidationException(nameof(AppointmentDTO.Time), "pages.appointments.errors.TIME_NOT_AVAILABLE");

            await context.SaveChangesAsync();

            return appointment;
        }

        public async Task Delete(int id, int facilityId)
        {
            var appointments = await context.Appointments.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (appointments == null)
                throw new NotFoundException();

            context.Appointments.Remove(appointments);
            await context.SaveChangesAsync();
        }

        public List<FreeTimeDTO> GetFreeTimes(List<Appointment> appointmentsOfTheDay, List<WorkingHour> workingHours, Service service, TimeSpan duration)
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

        public bool IsAppointmentTimeOk(List<Appointment> appointmentsOfTheDay, List<WorkingHour> workingHours, Appointment appointment)
        {
            var freeTimes = GetFreeTimes(appointmentsOfTheDay, workingHours, appointment.Service, appointment.Duration);

            foreach (var freeTime in freeTimes)
            {
                if (appointment.Time >= freeTime.From && appointment.Time <= freeTime.To)
                    return true;
            }

            return false;
        }

        private bool Overlap(TimeOnly startA, TimeOnly endA, TimeOnly startB, TimeOnly endB)
        {
            return startA < endB && endA > startB;
        }

        private bool Contains(TimeOnly startOuter, TimeOnly endOuter, TimeOnly startInner, TimeOnly endInner)
        {
            return startOuter <= startInner && endOuter >= endInner;
        }
    }
}
