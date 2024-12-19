using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IClientNotificationsService
    {
        Task<ClientNotificationsSettings> GetSettings(int facilityId);
        Task<ClientNotificationsSettings> UpdateSettings(int facilityId, ClientNotificationsSettingsDTO dto);
    }

    public class ClientNotificationsService : IClientNotificationsService
    {
        private MainDbContext context;

        public ClientNotificationsService(MainDbContext context)
        {
            this.context = context;
        }

        public async Task<ClientNotificationsSettings> GetSettings(int facilityId)
        {
            var facility = await context.Facilities.Include(f => f.ClientNotificationsSettings).FirstOrDefaultAsync(f => f.Id == facilityId);
            if (facility == null)
                throw new NotFoundException();

            return facility.ClientNotificationsSettings ?? new ClientNotificationsSettings();
        }

        public async Task<ClientNotificationsSettings> UpdateSettings(int facilityId, ClientNotificationsSettingsDTO dto)
        {
            var facility = await context.Facilities.Include(f => f.ClientNotificationsSettings).FirstOrDefaultAsync(f => f.Id == facilityId);
            if (facility == null)
                throw new NotFoundException();

            if (facility.ClientNotificationsSettings == null)
                facility.ClientNotificationsSettings = new ClientNotificationsSettings();

            facility.ClientNotificationsSettings.InstagramAPIAccessToken = dto.InstagramAPIAccessToken;

            await context.SaveChangesAsync();

            return facility.ClientNotificationsSettings;
        }
    }
}
