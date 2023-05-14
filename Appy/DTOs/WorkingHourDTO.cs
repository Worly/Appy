using Appy.Domain;
using Appy.Mappings;

namespace Appy.DTOs
{
    public class WorkingHourDTO : IMapFrom<WorkingHour>
    {
        public DayOfWeek DayOfWeek { get; set; }
        public TimeOnly TimeFrom { get; set; }
        public TimeOnly TimeTo { get; set; }
    }
}
