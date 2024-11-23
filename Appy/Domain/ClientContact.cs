using Appy.DTOs;
using System.Text.Json.Serialization;

namespace Appy.Domain
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum ContactType
    {
        Instagram,
        WhatsApp
    }

    public class ClientContact
    {
        public int Id { get; set; }

        public ContactType Type { get; set; }
        public string Value { get; set; }
        public int Order { get; set; }

        public ClientContactDTO GetDTO()
        {
            return new ClientContactDTO
            {
                Id = Id,
                Type = Type,
                Value = Value
            };
        }
    }
}
