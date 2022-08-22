using Appy.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Appy.Domain
{
    public class Service
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public string Name { get; set; }
        public string DisplayName { get; set; }
        public TimeSpan Duration { get; set; }
        public int ColorId { get; set; }

        public bool IsArchived { get; set; }

        public ServiceDTO GetDTO()
        {
            return new ServiceDTO()
            {
                Id = Id,
                Name = Name,
                DisplayName = DisplayName,
                Duration = Duration,
                ColorId = ColorId,
                IsArchived = IsArchived
            };
        }
    }
}
