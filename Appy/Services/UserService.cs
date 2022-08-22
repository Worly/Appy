using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;

namespace Appy.Services
{
    public interface IUserService
    {
        Task<LogInResponseDTO> Authenticate(LogInDTO model);
        Task<LogInResponseDTO> Register(RegisterDTO model);
        Task<User> GetById(int id);
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

        public async Task<LogInResponseDTO> Authenticate(LogInDTO model)
        {
            var user = await context.Users.FirstOrDefaultAsync(x => x.Email == model.Email);
            if (user == null)
                throw new NotFoundException();

            var passwordHash = HashPassword(model.Password, user.Salt);

            if (passwordHash != user.PasswordHash)
                throw new BadRequestException();

            // authentication successful so generate jwt token
            var token = GenerateJwtToken(user);

            return new LogInResponseDTO() { Token = token };
        }

        public async Task<LogInResponseDTO> Register(RegisterDTO model)
        {
            var userWithSameEmail = await context.Users.SingleOrDefaultAsync(x => x.Email == model.Email);
            if (userWithSameEmail != null)
                throw new ValidationException(nameof(RegisterDTO.Email), "pages.login-register.errors.EMAIL_TAKEN");

            var salt = GenerateSalt();
            var passwordHash = HashPassword(model.Password, salt);

            var user = new User()
            {
                Email = model.Email,
                Name = model.Name,
                Surname = model.Surname,
                PasswordHash = passwordHash,
                Salt = salt
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return new LogInResponseDTO() { Token = token };
        }

        public async Task<User> GetById(int id)
        {
            var user = await context.Users.Include(o => o.Facilities).FirstOrDefaultAsync(x => x.Id == id);
            if (user == null)
                throw new NotFoundException();

            return user;
        }

        private byte[] GenerateSalt()
        {
            var salt = new byte[128 / 8];
            RandomNumberGenerator.Fill(salt);

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
                new Claim("name", user.Name),
                new Claim("surname", user.Surname),
                new Claim("email", user.Email),
                new Claim("roles", Newtonsoft.Json.JsonConvert.SerializeObject(user.GetRoles().Select(o => o.ToString())))
            );
        }
    }
}
