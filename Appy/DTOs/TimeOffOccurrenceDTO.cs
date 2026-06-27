#pragma warning disable CS8618

namespace Appy.DTOs
{
    // A TimeOff rule expanded to a concrete day. Distinct from TimeOffDTO (the rule).
    public class TimeOffOccurrenceDTO
    {
        public int Id { get; set; }
        public DateOnly Date { get; set; }
        public string Label { get; set; }
        public string? Notes { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }

        // The wall-clock span this occurrence blocks out on its day. All-day covers the whole day.
        public (TimeOnly From, TimeOnly To) ToInterval()
            => IsAllDay
                ? (new TimeOnly(0, 0, 0), new TimeOnly(23, 59, 59))
                : (TimeFrom!.Value, TimeTo!.Value);
    }
}
