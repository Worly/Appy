using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services.MessagingServices;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Appy.Services
{
    public interface IClientNotificationsService
    {
        Task<ClientNotificationsSettings> GetSettings(int facilityId);
        Task<ClientNotificationsSettings> UpdateSettings(int facilityId, ClientNotificationsSettingsDTO dto);
        Task<bool> CanSendAppointmentConfirmationMessage(Client client);
        Task SendAppointmentConfirmationMessage(Client client, Appointment appointment, CultureInfo cultureInfo);
        Task SendAppointmentReminderMessage(Client client, Appointment appointment, CultureInfo cultureInfo);
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
            facility.ClientNotificationsSettings.AppointmentConfirmationMessageTemplate = dto.AppointmentConfirmationMessageTemplate;
            facility.ClientNotificationsSettings.AppointmentReminderTime = dto.AppointmentReminderTime;
            facility.ClientNotificationsSettings.AppointmentReminderMessageTemplate = dto.AppointmentReminderMessageTemplate;

            await context.SaveChangesAsync();

            return facility.ClientNotificationsSettings;
        }

        public async Task<bool> CanSendAppointmentConfirmationMessage(Client client)
        {
            var facility = await context.Facilities.Include(f => f.ClientNotificationsSettings).FirstOrDefaultAsync(f => f.Id == client.FacilityId);
            if (facility == null)
                throw new NotFoundException();

            var settings = facility.ClientNotificationsSettings;

            var appointmentConfirmationMessage = settings.AppointmentConfirmationMessageTemplate;
            if (string.IsNullOrEmpty(appointmentConfirmationMessage))
                return false;

            return client.Contacts.Any(c =>
                messagingServiceManager.IsSupported(c.Type) &&
                !string.IsNullOrEmpty(messagingServiceManager.GetAccessToken(c.Type, settings)));
        }

        public async Task SendAppointmentConfirmationMessage(Client client, Appointment appointment, CultureInfo cultureInfo)
        {
            var facility = await context.Facilities.Include(f => f.ClientNotificationsSettings).FirstOrDefaultAsync(f => f.Id == client.FacilityId);
            if (facility == null)
                throw new NotFoundException();

            var settings = facility.ClientNotificationsSettings;

            var message = settings.AppointmentConfirmationMessageTemplate;
            if (string.IsNullOrEmpty(message))
                throw new BadRequestException("Appointment confirmation message template is not set");

            message = FillInMessageTemplate(message, cultureInfo, client, appointment);

            await SendMessageTo(settings, client, message);
        }

        public async Task SendAppointmentReminderMessage(Client client, Appointment appointment, CultureInfo cultureInfo)
        {
            var facility = await context.Facilities.Include(f => f.ClientNotificationsSettings).FirstOrDefaultAsync(f => f.Id == client.FacilityId);
            if (facility == null)
                throw new NotFoundException();

            var settings = facility.ClientNotificationsSettings;

            var message = settings.AppointmentReminderMessageTemplate;
            if (string.IsNullOrEmpty(message))
                throw new BadRequestException("Appointment reminder message template is not set");

            message = FillInMessageTemplate(message, cultureInfo, client, appointment);

            await SendMessageTo(settings, client, message);
        }

        private async Task SendMessageTo(ClientNotificationsSettings settings, Client client, string message)
        {
            if (client.Contacts == null || client.Contacts.Count == 0)
                throw new BadRequestException("Client has no contacts");

            foreach (var contact in client.Contacts)
            {
                if (!messagingServiceManager.IsSupported(contact.Type))
                    continue;

                var messagingService = messagingServiceManager.GetService(contact.Type);
                var accessToken = messagingServiceManager.GetAccessToken(contact.Type, settings);

                if (string.IsNullOrEmpty(accessToken))
                    continue;

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
                    return;
            }

            throw new BadRequestException("pages.client-notifications.errors.MESSAGE_FAILED_TO_SEND");
        }

        private string FillInMessageTemplate(string template, CultureInfo cultureInfo, Client client, Appointment appointment)
        {
            return template
                .Replace("{clientName}", client.Name)
                .Replace("{clientSurname}", client.Surname)
                .Replace("{service}", appointment.Service.Name)
                .Replace("{date}", appointment.Date.ToString(cultureInfo.DateTimeFormat.LongDatePattern, cultureInfo))
                .Replace("{time}", appointment.Time.ToString(cultureInfo));
        }
    }
}
