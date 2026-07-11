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

        // Non-null ⇒ this time-off is a materialized imported holiday; carries the full holiday view
        // so the frontend needs no second fetch. Populated only where the ImportedHoliday nav is loaded.
        public HolidayDTO? Holiday { get; set; }
    }
}
