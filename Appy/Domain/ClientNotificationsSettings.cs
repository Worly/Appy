
using Appy.DTOs;
using NUnit.Framework;
using System.ComponentModel.DataAnnotations;
using System.Xml.Linq;

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
