namespace Appy.DTOs
{
    // The immutable public-holiday provenance — a 1:1 view of the ImportedHoliday row. Embedded in
    // TimeOffDTO (the TimeOff carries the edited values; this carries the original) and returned by
    // GET /holiday/get/{id} for the removed-holiday view (a removed holiday is only its original).
    public class HolidayDTO
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string CountryCode { get; set; } = "";
        public DateOnly Date { get; set; }
    }
}
