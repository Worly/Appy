using Appy.DTOs;

namespace Appy.Domain
{
    public class Appointment
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }
        public TimeSpan Duration { get; set; }

        public int ServiceId { get; set; }
        public Service Service { get; set; }

        public AppointmentDTO GetDTO()
        {
            return new AppointmentDTO()
            {
                Id = Id,
                Date = Date,
                Time = Time,
                Duration = Duration,
                Service = Service.GetDTO()
            };
        }
    }
}
