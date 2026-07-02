namespace Appy.DTOs
{
    public class HolidayEditDTO
    {
        public DateOnly Date { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public string? Notes { get; set; }
    }
}
