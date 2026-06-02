using System.Text.Json.Serialization;
using Appy.Utils;

namespace Appy.DTOs
{
    public class RegisterDTO
    {
        public string Email { get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }

        [JsonConverter(typeof(NoTrimStringConverter))]
        public string Password { get; set; }
    }
}
