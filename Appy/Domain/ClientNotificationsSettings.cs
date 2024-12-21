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

        public ClientNotificationsSettingsDTO GetDTO()
        {
            return new ClientNotificationsSettingsDTO()
            {
                InstagramAPIAccessToken = InstagramAPIAccessToken
            };
        }
    }
}
