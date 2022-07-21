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

        List<FreeTimeDTO> GetFreeTimes(List<Appointment> appointmentsOfTheDay, Service service, TimeSpan duration);
        bool IsAppointmentTimeOk(List<Appointment> appointmentsOfTheDay, Appointment appointment);
    }

    public class AppointmentService : IAppointmentService
    {
        private MainDbContext context;

        public AppointmentService(MainDbContext context)
        {
            this.context = context;
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
            var appointment = new Appointment()
            {
                FacilityId = facilityId,
                Date = dto.Date,
                Time = dto.Time,
                Duration = dto.Duration,
                ServiceId = dto.Service.Id
            };

            var sameDayAppointments = GetAll(dto.Date, facilityId);
            if (!IsAppointmentTimeOk(sameDayAppointments, appointment))
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

            appointment.Date = dto.Date;
            appointment.Time = dto.Time;
            appointment.Duration = dto.Duration;
            appointment.ServiceId = dto.Service.Id;

            var sameDayAppointments = GetAll(dto.Date, facilityId).Where(a => a.Id != appointment.Id).ToList();
            if (!IsAppointmentTimeOk(sameDayAppointments, appointment))
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

        public List<FreeTimeDTO> GetFreeTimes(List<Appointment> appointmentsOfTheDay, Service service, TimeSpan duration)
        {
            var result = new List<FreeTimeDTO>();

            FreeTimeDTO? currentFreeTime = null;

            // TODO: get schedule, for now just take from 8 to 14
            var startTime = new TimeOnly(8, 0, 0);
            var endTime = new TimeOnly(14, 0, 0);

            // loop through schedule with 5 minutes increment
            var time = startTime;
            while (time < endTime)
            {
                bool ok = true;

                // if appointment exceedes schedule duration thats not ok
                if (time.Add(duration) > endTime)
                    ok = false;
                else
                {
                    // loop through all appointments
                    foreach (var app in appointmentsOfTheDay)
                    {
                        // check if they overlap
                        if (time < app.Time.Add(app.Duration) && time.Add(duration) > app.Time)
                        {
                            ok = false;
                            break;
                        }
                    }
                }

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
                    result.Add(currentFreeTime);
                    currentFreeTime = null;
                }

                time = time.AddMinutes(5);
            }

            // check one last time if its available in the last slot of the day
            if (currentFreeTime != null)
            {
                currentFreeTime.To = time.AddMinutes(-5);
                result.Add(currentFreeTime);
                currentFreeTime = null;
            }

            return result;
        }

        public bool IsAppointmentTimeOk(List<Appointment> appointmentsOfTheDay, Appointment appointment)
        {
            var freeTimes = GetFreeTimes(appointmentsOfTheDay, appointment.Service, appointment.Duration);

            foreach (var freeTime in freeTimes)
            {
                if (appointment.Time >= freeTime.From && appointment.Time <= freeTime.To)
                    return true;
            }

            return false;
        }
    }
}
