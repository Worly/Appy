using Microsoft.EntityFrameworkCore;

namespace Appy.Domain
{
    [Index(nameof(Family), IsUnique = true)]
    public class LoginSession
    {
        public int Id { get; set; }

        public string UserAgent { get; set; }

        public string Family { get; set; }
        public string RefreshToken { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }
    }
}
