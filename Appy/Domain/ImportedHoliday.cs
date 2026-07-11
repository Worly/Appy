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

        // The immutable provider snapshot — a 1:1 view of this row. Embedded in the TimeOff DTO, which
        // separately carries the edited values, so "edited" is derived by comparing the two.
        public HolidayDTO GetDTO()
        {
            return new HolidayDTO
            {
                Id = Id,
                Name = Name,
                CountryCode = CountryCode,
                Date = Date,
            };
        }

        // Merged list projection: this row flattened with its linked TimeOff's current (edited) state.
        // A null linkedTimeOff means the holiday was removed.
        public HolidayListDTO GetListDTO(TimeOff? linkedTimeOff)
        {
            return new HolidayListDTO
            {
                Id = Id,
                Name = Name,
                Date = linkedTimeOff?.StartDate ?? Date,
                IsAllDay = linkedTimeOff?.IsAllDay ?? true,
                TimeFrom = linkedTimeOff?.TimeFrom,
                TimeTo = linkedTimeOff?.TimeTo,
                IsEdited = linkedTimeOff != null && (linkedTimeOff.StartDate != Date || !linkedTimeOff.IsAllDay),
                LinkedTimeOffId = linkedTimeOff?.Id,
            };
        }
    }
}
