namespace Appy.DTOs
{
    public class CalendarDayDTO
    {
        public DateOnly Date { get; set; }
        public List<AppointmentDTO> Appointments { get; set; }
        public List<WorkingHourDTO> WorkingHours { get; set; }
    }
}
