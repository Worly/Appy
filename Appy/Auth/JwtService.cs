using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Appy.Services
{
    public interface IJwtService
    {
        Task<(bool valid, JwtSecurityToken? token)> ValidateToken(string token);
        string GenerateToken(params Claim[] claims);
    }

    public class JwtService : IJwtService
    {
        private string jwtSecret;

        public JwtService(IConfiguration configuration)
        {
            this.jwtSecret = configuration.GetValue<string>("JWT:Secret");
        }

        public async Task<(bool valid, JwtSecurityToken? token)> ValidateToken(string token)
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
                    ValidateAudience = false
                });

                if (!result.IsValid)
                    return (false, null);

                return (true, result.SecurityToken as JwtSecurityToken);
            }
            catch
            {
                return (false, null);
            }
        }

        public string GenerateToken(params Claim[] claims)
        {
            // generate token that is valid for 7 days
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
