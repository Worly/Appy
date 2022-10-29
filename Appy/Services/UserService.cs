using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Security.Cryptography;
using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using System.Text;

namespace Appy.Services
{
    public interface IUserService
    {
        Task<LogInResponseDTO> Authenticate(LogInDTO model);
        Task<LogInResponseDTO> Register(RegisterDTO model);
        Task<LogInResponseDTO> RefreshTokens(string refreshToken);
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

            var accessToken = GenerateAccessJwtToken(user);
            var refreshToken = GenerateRefreshJwtToken(user.Id, GenerateFamily());

            user.RefreshToken = refreshToken;
            await context.SaveChangesAsync();

            return new LogInResponseDTO()
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
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

            var accessToken = GenerateAccessJwtToken(user);
            var refreshToken = GenerateRefreshJwtToken(user.Id, GenerateFamily());

            user.RefreshToken = refreshToken;
            await context.SaveChangesAsync();

            return new LogInResponseDTO()
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }

        // Refresh token rotation -> every time refresh token is used, generate a new one
        // Reuse protection -> using old but valid refresh token invalidates whole family
        public async Task<LogInResponseDTO> RefreshTokens(string refreshToken)
        {
            // get userId claim
            var (valid, token) = await jwtService.ValidateToken(refreshToken, validateLifetime: false);
            if (!valid || token == null)
                throw new BadRequestException();

            if (!int.TryParse(token.Claims.FirstOrDefault(c => c.Type == "id")?.Value, out int userId))
                throw new BadRequestException();

            var user = await context.Users.FirstOrDefaultAsync(x => x.Id == userId);
            if (user == null)
                throw new BadRequestException();

            string? currentFamily = user.RefreshToken == null ? null : jwtService.ParseToken(user.RefreshToken)?.Claims.FirstOrDefault(c => c.Type == "family")?.Value;

            // check families
            {
                string? receivedFamily = token.Claims.FirstOrDefault(c => c.Type == "family")?.Value;
                if (receivedFamily == null)
                    throw new BadRequestException();

                if (user.RefreshToken != refreshToken)
                {
                    // if we received a valid token with the same family someone stole the refresh token!
                    if (currentFamily == receivedFamily)
                    {
                        user.RefreshToken = null;
                        await context.SaveChangesAsync();
                    }

                    throw new BadRequestException();
                }
            }

            // check lifetime
            {
                var (validLifetime, tokenLifetime) = await jwtService.ValidateToken(refreshToken, validateLifetime: true);
                if (!validLifetime || tokenLifetime == null)
                    throw new BadRequestException();
            }

            // generate new
            if (currentFamily == null)
                currentFamily = GenerateFamily();

            var newRefreshToken = GenerateRefreshJwtToken(userId, currentFamily);
            var newAccesToken = GenerateAccessJwtToken(user);

            user.RefreshToken = newRefreshToken;
            await context.SaveChangesAsync();

            return new LogInResponseDTO()
            {
                RefreshToken = newRefreshToken,
                AccessToken = newAccesToken
            };
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

        private string GenerateFamily()
        {
            return Encoding.ASCII.GetString(RandomNumberGenerator.GetBytes(64));
        }

        private string GenerateAccessJwtToken(User user)
        {
            return jwtService.GenerateToken(
                //new TimeSpan(hours: 3, minutes: 0, seconds: 0),
                new TimeSpan(hours: 0, minutes: 0, seconds: 10),
                new Claim("id", user.Id.ToString()),
                new Claim("name", user.Name),
                new Claim("surname", user.Surname),
                new Claim("email", user.Email),
                new Claim("roles", Newtonsoft.Json.JsonConvert.SerializeObject(user.GetRoles().Select(o => o.ToString())))
            );
        }

        private string GenerateRefreshJwtToken(int userId, string family)
        {
            return jwtService.GenerateToken(
                new TimeSpan(days: 7, hours: 0, minutes: 0, seconds: 0),
                new Claim("id", userId.ToString()),
                new Claim("family", family)
            );
        }
    }
}
