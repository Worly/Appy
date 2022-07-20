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
    }
}
