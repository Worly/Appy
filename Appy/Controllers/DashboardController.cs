using Microsoft.AspNetCore.Mvc;
using Appy.Auth;
using Appy.Services.Facilities;
using Appy.Services;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class DashboardController : ControllerBase
    {
        private readonly IAppointmentService appointmentService;

        public DashboardController(IAppointmentService appointmentService)
        {
            this.appointmentService = appointmentService;
        }

        [HttpGet("bookedToday")]
        [Authorize]
        public async Task<ActionResult<int>> BookedToday()
        {
            return Ok(await appointmentService.GetNumberOfAppointmentsCreatedToday(HttpContext.SelectedFacility()));
        }

    }
}
