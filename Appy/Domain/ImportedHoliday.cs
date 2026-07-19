using Appy.DTOs;
using Microsoft.EntityFrameworkCore;

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

        // The TimeOff materialized from this holiday, or null when the holiday was removed. The TimeOff
        // owns the FK (ImportedHolidayId); this is its 1:1 inverse so callers can Include it directly.
        public TimeOff? LinkedTimeOff { get; set; }

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
        // A null LinkedTimeOff means the holiday was removed.
        public HolidayListDTO GetListDTO()
        {
            return new HolidayListDTO
            {
                Id = Id,
                Name = Name,
                Date = LinkedTimeOff?.StartDate ?? Date,
                IsAllDay = LinkedTimeOff?.IsAllDay ?? true,
                TimeFrom = LinkedTimeOff?.TimeFrom,
                TimeTo = LinkedTimeOff?.TimeTo,
                IsEdited = LinkedTimeOff != null && (LinkedTimeOff.StartDate != Date || !LinkedTimeOff.IsAllDay),
                LinkedTimeOffId = LinkedTimeOff?.Id,
            };
        }

        // A fresh all-day one-off TimeOff for this holiday's original date, linked back to this row.
        // The single source of the holiday→TimeOff shape, used when materializing and when restoring.
        public TimeOff ToTimeOff()
        {
            return new TimeOff
            {
                FacilityId = FacilityId,
                Label = Name,
                Recurrence = TimeOffRecurrence.OneOff,
                StartDate = Date,
                EndDate = Date,
                IsAllDay = true,
                ImportedHoliday = this,
            };
        }

        public static void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder
                .Entity<ImportedHoliday>()
                .HasOne(h => h.LinkedTimeOff)
                .WithOne(t => t.ImportedHoliday)
                .HasForeignKey<TimeOff>(t => t.ImportedHolidayId)
                .OnDelete(DeleteBehavior.NoAction);
        }
    }
}
