using Appy.DTOs;

namespace Appy.Domain
{
    public class WorkingHour
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }

        public Facility Facility { get; set; }

        public DayOfWeek DayOfWeek { get; set; }

        public TimeOnly TimeFrom { get; set; }
        
        public TimeOnly TimeTo { get; set; }

        public WorkingHourDTO GetDTO()
        {
            return new WorkingHourDTO()
            {
                DayOfWeek = DayOfWeek,
                TimeFrom = TimeFrom,
                TimeTo = TimeTo
            };
        }

        public static WorkingHour Create(int facilityId, DayOfWeek dayOfWeek, TimeOnly timeFrom, TimeOnly timeTo)
        {
            return new WorkingHour()
            {
                FacilityId = facilityId,
                DayOfWeek = dayOfWeek,
                TimeFrom = timeFrom,
                TimeTo = timeTo
            };
        }
    }
}
