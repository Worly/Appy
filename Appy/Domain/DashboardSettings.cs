using Appy.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Appy.Domain
{
    [Index(nameof(UserId), nameof(FacilityId), IsUnique = true)]
    public class DashboardSettings
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public string SettingsJSON { get; set; }

        public DashboardSettingsDTO GetDTO()
        {
            return new DashboardSettingsDTO()
            {
                SettingsJSON = SettingsJSON
            };
        }
    }
}
