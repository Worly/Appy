namespace Appy.DTOs
{
    public class WorkingHourDTO
    {
        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly TimeFrom { get; set; }
        public TimeOnly TimeTo { get; set; }
    }
}
