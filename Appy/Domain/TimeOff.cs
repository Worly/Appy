using Appy.DTOs;
using System.Text.Json.Serialization;

#pragma warning disable CS8618

namespace Appy.Domain
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum TimeOffRecurrence
    {
        OneOff,
        Weekly,
        Monthly,
    }

    public class TimeOff
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public string Label { get; set; }
        public string? Notes { get; set; }

        public TimeOffRecurrence Recurrence { get; set; }

        // OneOff: blocked-from / blocked-to (both required).
        // Weekly/Monthly: effective-from (required) plus an optional effective-until (null = open-ended).
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; }

        public DayOfWeek? DayOfWeek { get; set; }   // Weekly only
        public int? DayOfMonth { get; set; }        // Monthly only, 1..31

        public bool IsAllDay { get; set; }
        public TimeOnly? TimeFrom { get; set; }      // when !IsAllDay
        public TimeOnly? TimeTo { get; set; }

        // Non-null ⇒ this TimeOff is a materialized imported holiday. See ImportedHoliday.
        public int? ImportedHolidayId { get; set; }
        public ImportedHoliday? ImportedHoliday { get; set; }

        public TimeOffDTO GetDTO()
        {
            return new TimeOffDTO()
            {
                Id = Id,
                Label = Label,
                Notes = Notes,
                Recurrence = Recurrence,
                StartDate = StartDate,
                EndDate = EndDate,
                DayOfWeek = DayOfWeek,
                DayOfMonth = DayOfMonth,
                IsAllDay = IsAllDay,
                TimeFrom = TimeFrom,
                TimeTo = TimeTo,
            };
        }
    }
}
