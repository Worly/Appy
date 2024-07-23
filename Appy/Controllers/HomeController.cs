using Microsoft.AspNetCore.Mvc;
using Appy.Auth;
using Appy.Services.Facilities;
using Appy.DTOs;
using Appy.Services;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class HomeController : ControllerBase
    {
        private readonly IAppointmentService appointmentService;

        public HomeController(IAppointmentService appointmentService)
        {
            this.appointmentService = appointmentService;
        }

        [HttpGet("stats")]
        [Authorize]
        public async Task<ActionResult<HomeStatsDTO>> Stats()
        {
            return Ok(new HomeStatsDTO()
            {
                NumberOfAppointmentsCreatedToday = await appointmentService.GetNumberOfAppointmentsCreatedToday(HttpContext.SelectedFacility())
            });
        }

    }
}
