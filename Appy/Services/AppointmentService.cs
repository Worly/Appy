using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IAppointmentService
    {
        List<Appointment> GetAll(DateOnly date, int facilityId);
        Appointment GetById(int id, int facilityId);
        Appointment AddNew(AppointmentDTO dto, int facilityId);
        Appointment Edit(int id, AppointmentDTO dto, int facilityId);
        void Delete(int id, int facilityId);

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

        public List<Appointment> GetAll(DateOnly date, int facilityId)
        {
            return context.Appointments.Include(a => a.Service).Where(s => s.FacilityId == facilityId && s.Date == date).ToList();
        }

        public Appointment GetById(int id, int facilityId)
        {
            var appointment = context.Appointments.Include(a => a.Service).FirstOrDefault(s => s.Id == id && s.FacilityId == facilityId);
            if (appointment == null)
                throw new NotFoundException();

            return appointment;
        }

        public Appointment AddNew(AppointmentDTO dto, int facilityId)
        {
            var service = context.Services.FirstOrDefault(s => s.Id == dto.Service.Id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException("Unknown service");

            var appointment = new Appointment()
            {
                FacilityId = facilityId,
                Date = dto.Date,
                Time = dto.Time,
                Duration = dto.Duration,
                Service = service
            };

            var sameDayAppointments = GetAll(dto.Date, facilityId);
            var workingHours = workingHourService.GetWorkingHours(dto.Date, facilityId);
            if (!IsAppointmentTimeOk(sameDayAppointments, workingHours, appointment))
                throw new ValidationException(nameof(AppointmentDTO.Time), "pages.appointments.errors.TIME_TAKEN");

            context.Appointments.Add(appointment);
            context.SaveChanges();

            return appointment;
        }

        public Appointment Edit(int id, AppointmentDTO dto, int facilityId)
        {
            var appointment = context.Appointments.FirstOrDefault(s => s.Id == id && s.FacilityId == facilityId);
            if (appointment == null)
                throw new NotFoundException();

            var service = context.Services.FirstOrDefault(s => s.Id == dto.Service.Id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException("Unknown service");

            appointment.Date = dto.Date;
            appointment.Time = dto.Time;
            appointment.Duration = dto.Duration;
            appointment.Service = service;

            var sameDayAppointments = GetAll(dto.Date, facilityId).Where(a => a.Id != appointment.Id).ToList();
            var workingHours = workingHourService.GetWorkingHours(dto.Date, facilityId);
            if (!IsAppointmentTimeOk(sameDayAppointments, workingHours, appointment))
                throw new ValidationException(nameof(AppointmentDTO.Time), "pages.appointments.errors.TIME_TAKEN");

            context.SaveChanges();

            return appointment;
        }

        public void Delete(int id, int facilityId)
        {
            var appointments = context.Appointments.FirstOrDefault(s => s.Id == id && s.FacilityId == facilityId);
            if (appointments == null)
                throw new NotFoundException();

            context.Appointments.Remove(appointments);
            context.SaveChanges();
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
