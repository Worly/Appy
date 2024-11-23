
using Appy.Domain;

namespace Appy.DTOs
{
    public class ClientContactDTO
    {
        public int Id { get; set; }

        public ContactType Type { get; set; }
        public string Value { get; set; }
    }
}
