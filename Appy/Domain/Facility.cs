using Appy.DTOs;

namespace Appy.Domain
{
    public class Facility
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int OwnerId { get; set; }
        public User Owner { get; set; }

        public FacilityDTO GetDTO()
        {
            return new FacilityDTO()
            {
                Id = Id,
                Name = Name
            };
        }
    }
}
