namespace Appy.DTOs
{
    public class CalendarDayDTO
    {
        public DateOnly Date { get; set; }
        public List<AppointmentViewDTO> Appointments { get; set; }
        public List<WorkingHourDTO> WorkingHours { get; set; }
    }
}
