using Appy.DTOs;

namespace Appy.Domain
{
    public class Client
    {
        public int Id { get; set; }

        public int FacilityId { get; set; }
        public Facility Facility { get; set; }

        public string Name { get; set; }
        public string? Surname { get; set; }
        public List<ClientContact> Contacts { get; set; }
        public string? Notes { get; set; }

        public bool IsArchived { get; set; }

        public ClientDTO GetDTO()
        {
            return new ClientDTO()
            {
                Id = Id,
                Name = Name,
                Surname = Surname,
                Notes = Notes,
                IsArchived = IsArchived,
                Contacts = Contacts?.OrderBy(o => o.Order).Select(c => c.GetDTO()).ToList(),
            };
        }
    }
}
