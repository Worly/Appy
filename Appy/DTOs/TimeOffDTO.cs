using Appy.Domain;

#pragma warning disable CS8618

namespace Appy.DTOs
{
    public class TimeOffDTO
    {
        public int Id { get; set; }
        public string Label { get; set; }
        public string? Notes { get; set; }
        public TimeOffRecurrence Recurrence { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
        public DayOfWeek? DayOfWeek { get; set; }
        public int? DayOfMonth { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public int? ImportedHolidayId { get; set; }
    }
}
