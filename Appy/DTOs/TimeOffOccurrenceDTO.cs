#pragma warning disable CS8618

namespace Appy.DTOs
{
    // A TimeOff rule expanded to a concrete day. Distinct from TimeOffDTO (the rule).
    public class TimeOffOccurrenceDTO
    {
        public DateOnly Date { get; set; }
        public string Label { get; set; }
        public string? Notes { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
    }
}
