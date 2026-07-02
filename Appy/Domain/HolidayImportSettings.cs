using System.ComponentModel.DataAnnotations;

#pragma warning disable CS8618

namespace Appy.Domain
{
    public class HolidayImportSettings
    {
        [Key]
        public int FacilityId { get; set; }

        // The currently-configured country (ISO code). null ⇒ auto-import is off.
        public string? CountryCode { get; set; }
    }
}
