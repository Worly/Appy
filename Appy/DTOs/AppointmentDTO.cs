using Appy.Domain;

namespace Appy.DTOs
{
    public class AppointmentDTO
    {
        public int Id { get; set; }

        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }
        public TimeSpan Duration { get; set; }

        public ServiceDTO Service { get; set; }
        public ClientDTO Client { get; set; }

        public AppointmentStatus Status { get; set; }

        public string? Notes { get; set; }
    }

    public class FreeTimeDTO
    {
        public TimeOnly From { get; set; }
        public TimeOnly To { get; set; }
        public TimeOnly ToIncludingDuration { get; set; }
    }
}
