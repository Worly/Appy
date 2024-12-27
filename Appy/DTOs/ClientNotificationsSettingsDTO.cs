#pragma warning disable CS8618

namespace Appy.DTOs
{
    public class ClientNotificationsSettingsDTO
    {
        public string InstagramAPIAccessToken { get; set; }
        public string AppointmentConfirmationMessageTemplate { get; set; }
        /// <summary>
        /// Only time part is used (together with the timezone)
        /// </summary>
        public DateTime? AppointmentReminderTime { get; set; }
        public string AppointmentReminderMessageTemplate { get; set; }
    }
}
