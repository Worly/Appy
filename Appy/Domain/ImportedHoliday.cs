using Appy.DTOs;

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

        // The holiday view merges immutable provenance (this row) with its current linked TimeOff.
        // A null linkedTimeOff means the holiday was removed; the effective date/time then fall back
        // to the provider snapshot.
        public HolidayDTO GetDTO(TimeOff? linkedTimeOff)
        {
            return new HolidayDTO
            {
                Id = Id,
                Name = Name,
                CountryCode = CountryCode,
                Date = linkedTimeOff?.StartDate ?? Date,
                OriginalDate = Date,
                IsAllDay = linkedTimeOff?.IsAllDay ?? true,
                TimeFrom = linkedTimeOff?.TimeFrom,
                TimeTo = linkedTimeOff?.TimeTo,
                Notes = linkedTimeOff?.Notes,
                IsEdited = linkedTimeOff != null && (linkedTimeOff.StartDate != Date || !linkedTimeOff.IsAllDay),
                IsRemoved = linkedTimeOff == null,
            };
        }
    }
}
