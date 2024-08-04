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
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Notes { get; set; }

        public bool IsArchived { get; set; }

        public ClientDTO GetDTO()
        {
            return new ClientDTO()
            {
                Id = Id,
                Name = Name,
                Surname = Surname,
                PhoneNumber = PhoneNumber,
                Email = Email,
                Notes = Notes,
                IsArchived = IsArchived
            };
        }
    }
}
