using Appy.DTOs;
using System.ComponentModel.DataAnnotations;

#pragma warning disable CS8618

namespace Appy.Domain
{
    public class ClientNotificationsSettings
    {
        [Key]
        public int FacilityId { get; set; }

        public string InstagramAPIAccessToken { get; set; }

        public string AppointmentConfirmationMessageTemplate { get; set; }

        /// <summary>
        /// Only time part is used (together with the timezone)
        /// </summary>
        public DateTime? AppointmentReminderTime { get; set; }
        public string AppointmentReminderMessageTemplate { get; set; }

        public ClientNotificationsSettingsDTO GetDTO()
        {
            return new ClientNotificationsSettingsDTO()
            {
                InstagramAPIAccessToken = InstagramAPIAccessToken,
                AppointmentConfirmationMessageTemplate = AppointmentConfirmationMessageTemplate,
                AppointmentReminderTime = AppointmentReminderTime,
                AppointmentReminderMessageTemplate = AppointmentReminderMessageTemplate
            };
        }
    }
}
