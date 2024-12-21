using Appy.DTOs;

#pragma warning disable CS8618

namespace Appy.Domain
{
    public class Facility
    {
        public int Id { get; set; }
        public string Name { get; set; }

        public int OwnerId { get; set; }
        public User Owner { get; set; }

        public ClientNotificationsSettings ClientNotificationsSettings { get; set; }

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
