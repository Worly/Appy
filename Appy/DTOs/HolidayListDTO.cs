#pragma warning disable CS8618

namespace Appy.DTOs
{
    // Merged holiday view for the holidays list — the ImportedHoliday flattened together with its
    // linked TimeOff's current (edited) state, so a row can render date/time and the edited badge
    // without a second fetch. LinkedTimeOffId is null when the holiday has been removed.
    public class HolidayListDTO
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public DateOnly Date { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public bool IsEdited { get; set; }
        public int? LinkedTimeOffId { get; set; }
    }
}
