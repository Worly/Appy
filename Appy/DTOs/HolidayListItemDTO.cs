#pragma warning disable CS8618

namespace Appy.DTOs
{
    // Lean projection for the holidays list — only what a row renders, plus LinkedTimeOffId for
    // navigation (non-null → open the linked TimeOff; null → the holiday is removed). Full details
    // (country, original date, notes) are fetched on open, not carried in the list.
    public class HolidayListItemDTO
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
