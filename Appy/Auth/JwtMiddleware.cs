using Microsoft.AspNetCore.Http;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Threading.Tasks;
using Appy.Services;

namespace Appy.Auth
{
    public class JwtMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IJwtService jwtService;

        public JwtMiddleware(RequestDelegate next, IJwtService jwtService)
        {
            _next = next;
            this.jwtService = jwtService;
        }

        public async Task Invoke(HttpContext context, IUserService userService)
        {
            var token = context.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();

            if (token != null)
                AttachUserToContext(context, userService, token);

            await _next(context);
        }

        private void AttachUserToContext(HttpContext context, IUserService userService, string token)
        {
            if (jwtService.ValidateToken(token, out JwtSecurityToken jwtToken)) {
                var userId = int.Parse(jwtToken.Claims.First(x => x.Type == "id").Value);

                // attach user to context on successful jwt validation
                context.Items["User"] = userService.GetById(userId);
            }
        }
    }
}
