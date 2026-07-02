namespace Appy.DTOs
{
    public class HolidayDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string CountryCode { get; set; } = "";
        public DateOnly Date { get; set; }
        public DateOnly OriginalDate { get; set; }
        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public string? Notes { get; set; }
        public bool IsEdited { get; set; }
        public bool IsRemoved { get; set; }
    }
}
