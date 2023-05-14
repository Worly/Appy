using Microsoft.AspNetCore.Mvc;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Auth;
using Appy.Contracts;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UserController : ControllerBase
    {
        private IUserService userService;

        public UserController(IUserService userService)
        {
            this.userService = userService;
        }

        [HttpPost("login")]
        public async Task<ActionResult> LogIn(LogInDTO dto)
        {
            try
            {
                var response = await userService.Authenticate(dto);
                return Ok(response);
            }
            catch (HttpException)
            {
                return BadRequest(new ErrorBuilder().Add("pages.login-register.errors.WRONG_LOGIN"));
            }
        }

        [HttpPost("register")]
        public async Task<ActionResult> Register(RegisterDTO dto)
        {
            var response = await userService.Register(dto);

            return Ok(response);
        }

        [HttpPost("refresh")]
        public async Task<ActionResult> RefreshTokens([FromBody] RefreshTokensDTO dto)
        {
            var response = await userService.RefreshTokens(dto.RefreshToken);

            return Ok(response);
        }
    }
}
