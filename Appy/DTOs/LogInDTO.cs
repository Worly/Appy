using System.Text.Json.Serialization;
using Appy.Utils;

namespace Appy.DTOs
{
    public class LogInDTO
    {
        public string Email { get; set; }

        [JsonConverter(typeof(NoTrimStringConverter))]
        public string Password { get; set; }
    }

    public class LogInResponseDTO
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
    }
}
