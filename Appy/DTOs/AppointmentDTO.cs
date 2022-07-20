namespace Appy.DTOs
{
    public class AppointmentDTO
    {
        public int Id { get; set; }

        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }
        public TimeSpan Duration { get; set; }

        public ServiceDTO Service { get; set; }
    }
}
