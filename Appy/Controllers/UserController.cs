using Microsoft.AspNetCore.Mvc;
using Appy.DTOs;
using Appy.Services;
using Appy.Exceptions;

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
    }
}
