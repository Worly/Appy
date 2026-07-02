#pragma warning disable CS8618

namespace Appy.Domain
{
    // One row per materialized holiday occurrence. Persists independently of its linked TimeOff —
    // a missing TimeOff means the holiday was removed. CountryCode is stored per-occurrence because
    // a facility's configured country can change and each row must carry its own provenance.
    public class ImportedHoliday
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public string CountryCode { get; set; }

        // Localized holiday name (provider localName); used as the linked TimeOff's Label.
        public string Name { get; set; }

        // The provider-computed date — immutable; the import job's match key together with (FacilityId, CountryCode).
        public DateOnly Date { get; set; }
    }
}
