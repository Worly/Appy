namespace Appy.Domain
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }
        
        public string PasswordHash { get; set; }
        public byte[] Salt { get; set; }

        public int? SelectedFacilityId { get; set; }

        public ICollection<LoginSession> LoginSessions { get; set; }
        public ICollection<Facility> Facilities { get; set; }

        public List<string> GetRoles()
        {
            var roles = new List<string>();

            return roles;
        }
    }
}
