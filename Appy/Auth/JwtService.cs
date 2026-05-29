using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Appy.Services
{
    public interface IJwtService
    {
        Task<(bool valid, JwtSecurityToken? token)> ValidateToken(string token, bool validateLifetime = true);
        JwtSecurityToken? ParseToken(string token);
        string GenerateToken(TimeSpan lifespan, params Claim[] claims);
    }

    public class JwtService : IJwtService
    {
        private string jwtSecret;
        private readonly ILogger<JwtService> logger;

        public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
        {
            this.jwtSecret = configuration["JwtSecret"]!;
            this.logger = logger;
        }

        public async Task<(bool valid, JwtSecurityToken? token)> ValidateToken(string token, bool validateLifetime = true)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(jwtSecret);
                var result = await tokenHandler.ValidateTokenAsync(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = validateLifetime,
                    ClockSkew = TimeSpan.Zero,
                });

                if (!result.IsValid)
                {
                    if (result.Exception != null)
                        logger.LogDebug(result.Exception, "JWT validation failed");
                    return (false, null);
                }

                return (true, result.SecurityToken as JwtSecurityToken);
            }
            catch (SecurityTokenException e)
            {
                logger.LogDebug(e, "JWT validation rejected token");
                return (false, null);
            }
            catch (Exception e)
            {
                logger.LogError(e, "Unexpected exception while validating JWT");
                return (false, null);
            }
        }

        public JwtSecurityToken? ParseToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                return tokenHandler.ReadJwtToken(token);
            }
            catch (ArgumentException e)
            {
                logger.LogDebug(e, "Failed to parse JWT: malformed input");
                return null;
            }
            catch (Exception e)
            {
                logger.LogError(e, "Unexpected exception while parsing JWT");
                return null;
            }
        }

        public string GenerateToken(TimeSpan lifespan, params Claim[] claims)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.Add(lifespan),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
