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
                return BadRequest(new ErrorBuilder().Add("WrongLogin"));

            return Ok(response);
        }

        [HttpPost("register")]
        public IActionResult Register(RegisterDTO dto)
        {
            var response = userService.Register(dto);

            if (response == null)
                return BadRequest(new ErrorBuilder().Add(nameof(dto.Email), "EmailTaken"));

            return Ok(response);
        }
    }
}
