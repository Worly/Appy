using Microsoft.AspNetCore.Mvc;
using Appy.DTOs;
using Appy.Services;

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
        public IActionResult LogIn(LogInDTO dto)
        {
            var response = userService.Authenticate(dto);

            if (response == null)
                return BadRequest(new ErrorBuilder().Add("pages.login-register.errors.WRONG_LOGIN"));

            return Ok(response);
        }

        [HttpPost("register")]
        public IActionResult Register(RegisterDTO dto)
        {
            var response = userService.Register(dto);

            if (response == null)
                return BadRequest(new ErrorBuilder().Add(nameof(dto.Email), "pages.login-register.errors.EMAIL_TAKEN"));

            return Ok(response);
        }
    }
}
