using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using Appy.Domain;
using Appy.DTOs;

namespace Appy.Services
{
    public interface IUserService
    {
        LogInResponseDTO Authenticate(LogInDTO model);
        LogInResponseDTO Register(RegisterDTO model);
        User GetById(int id);
    }

    public class UserService : IUserService
    {
        private MainDbContext context;
        private IJwtService jwtService;

        public UserService(MainDbContext mainDbContext, IJwtService jwtService)
        {
            this.context = mainDbContext;
            this.jwtService = jwtService;
        }

        public LogInResponseDTO Authenticate(LogInDTO model)
        {
            var user = context.Users.SingleOrDefault(x => x.Email == model.Email);
            if (user == null)
                return null;

            var passwordHash = HashPassword(model.Password, user.Salt);

            if (passwordHash != user.PasswordHash)
                return null;

            // authentication successful so generate jwt token
            var token = GenerateJwtToken(user);

            return new LogInResponseDTO() { Token = token };
        }

        public LogInResponseDTO Register(RegisterDTO model)
        {
            var userWithSameEmail = context.Users.SingleOrDefault(x => x.Email == model.Email);
            if (userWithSameEmail != null)
                return null;

            var salt = GenerateSalt();
            var passwordHash = HashPassword(model.Password, salt);

            var user = new User()
            {
                Email = model.Email,
                Username = model.Username,
                PasswordHash = passwordHash,
                Salt = salt
            };

            context.Users.Add(user);
            context.SaveChanges();

            var token = GenerateJwtToken(user);

            return new LogInResponseDTO() { Token = token };
        }

        public User GetById(int id)
        {
            return context.Users.Include(o => o.Facilities).FirstOrDefault(x => x.Id == id);
        }

        private byte[] GenerateSalt()
        {
            var salt = new byte[128 / 8];
            using (var rngCsp = new RNGCryptoServiceProvider())
            {
                rngCsp.GetNonZeroBytes(salt);
            }

            return salt;
        }

        private string HashPassword(string password, byte[] salt)
        {
            // derive a 256-bit subkey (use HMACSHA256 with 100,000 iterations)
            string hashed = Convert.ToBase64String(KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: 100000,
                numBytesRequested: 256 / 8));

            return hashed;
        }

        private string GenerateJwtToken(User user)
        {
            return jwtService.GenerateToken(
                new Claim("id", user.Id.ToString()),
                new Claim("username", user.Username),
                new Claim("email", user.Email),
                new Claim("roles", Newtonsoft.Json.JsonConvert.SerializeObject(user.GetRoles().Select(o => o.ToString())))
            );
        }
    }
}
