using Appy.Auth;
using Appy.DTOs;
using Appy.Services;
using Appy.Services.Facilities;
using Microsoft.AspNetCore.Mvc;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class ClientNotificationsController : ControllerBase
    {
        private IClientNotificationsService clientNotificationsService;

        public ClientNotificationsController(IClientNotificationsService clientNotificationsService)
        {
            this.clientNotificationsService = clientNotificationsService;
        }

        [HttpGet("settings")]
        [Authorize]
        public async Task<ActionResult<ClientNotificationsSettingsDTO>> GetSettings()
        {
            var result = await this.clientNotificationsService.GetSettings(HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPut("settings")]
        [Authorize]
        public async Task<ActionResult<ClientNotificationsSettingsDTO>> UpdateSettings(ClientNotificationsSettingsDTO dto)
        {
            var result = await this.clientNotificationsService.UpdateSettings(HttpContext.SelectedFacility(), dto);

            return Ok(result.GetDTO());
        }
    }
}
