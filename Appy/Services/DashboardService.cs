using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IDashboardService
    {
        Task<DashboardSettings> GetSettings(int userId, int facilityId);
        Task<DashboardSettings> SaveSettings(int userId, int facilityId, DashboardSettingsDTO dto);
    }

    public class DashboardService : IDashboardService
    {
        private MainDbContext context;

        public DashboardService(MainDbContext context)
        {
            this.context = context;
        }

        public async Task<DashboardSettings> GetSettings(int userId, int facilityId)
        {
            var settings = await this.context.DashboardSettings.Where(s => s.UserId == userId && s.FacilityId == facilityId).SingleOrDefaultAsync();
            if (settings == null)
                throw new NotFoundException();

            return settings;
        }

        public async Task<DashboardSettings> SaveSettings(int userId, int facilityId, DashboardSettingsDTO dto)
        {
            var settings = await this.context.DashboardSettings.Where(s => s.UserId == userId && s.FacilityId == facilityId).SingleOrDefaultAsync();
            if (settings == null)
            {
                settings = new DashboardSettings()
                {
                    UserId = userId,
                    FacilityId = facilityId
                };

                this.context.DashboardSettings.Add(settings);
            }

            settings.SettingsJSON = dto.SettingsJSON;

            await this.context.SaveChangesAsync();

            return settings;
        }
    }
}
