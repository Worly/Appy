using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services.MessagingServices;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface IClientNotificationsService
    {
        Task<ClientNotificationsSettings> GetSettings(int facilityId);
        Task<ClientNotificationsSettings> UpdateSettings(int facilityId, ClientNotificationsSettingsDTO dto);
        Task<bool> SendMessageTo(Client client, string message);
    }

    public class ClientNotificationsService : IClientNotificationsService
    {
        private MainDbContext context;

        private IMessagingServiceManager messagingServiceManager;

        public ClientNotificationsService(MainDbContext context, IMessagingServiceManager messagingServiceManager)
        {
            this.context = context;
            this.messagingServiceManager = messagingServiceManager;
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

        public async Task<bool> SendMessageTo(Client client, string message)
        {
            var facility = await context.Facilities.Include(f => f.ClientNotificationsSettings).FirstOrDefaultAsync(f => f.Id == client.FacilityId);
            if (facility == null)
                throw new NotFoundException();

            foreach (var contact in client.Contacts)
            {
                var accessToken = messagingServiceManager.GetAccessToken(contact.Type, facility.ClientNotificationsSettings);
                var messagingService = messagingServiceManager.GetService(contact.Type);

                if (string.IsNullOrEmpty(contact.AppSpecificID))
                {
                    var appSpecificID = await messagingService.GetAppSpecificUserID(accessToken, contact.Value);
                    if (string.IsNullOrEmpty(appSpecificID))
                        continue;

                    context.Attach(contact);

                    contact.AppSpecificID = appSpecificID;

                    await context.SaveChangesAsync();
                }

                var success = await messagingService.SendMessage(accessToken, contact.AppSpecificID, message);
                if (success)
                    return true;
            }

            return false;
        }
    }
}
