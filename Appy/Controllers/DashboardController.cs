using Microsoft.AspNetCore.Mvc;
using Appy.Auth;
using Appy.Services.Facilities;
using Appy.Services;
using Appy.Services.SmartFiltering;
using Appy.Domain;
using Appy.DTOs;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService dashboardService;
        private readonly IAppointmentService appointmentService;

        public DashboardController(IDashboardService dashboardService, IAppointmentService appointmentService)
        {
            this.dashboardService = dashboardService;
            this.appointmentService = appointmentService;
        }

        [HttpGet("settings")]
        [Authorize]
        public async Task<ActionResult<DashboardSettingsDTO>> GetDashboardSettings()
        {
            var settings = await dashboardService.GetSettings(HttpContext.CurrentUser().Id, HttpContext.SelectedFacility());

            return settings.GetDTO();
        }

        [HttpPut("settings")]
        [Authorize]
        public async Task<ActionResult<DashboardSettingsDTO>> SaveDashboardSettings(DashboardSettingsDTO dto)
        {
            var settings = await dashboardService.SaveSettings(HttpContext.CurrentUser().Id, HttpContext.SelectedFacility(), dto);

            return settings.GetDTO();
        }

        [HttpGet("bookedToday")]
        [Authorize]
        public async Task<ActionResult<int>> BookedToday()
        {
            return Ok(await appointmentService.GetNumberOfAppointmentsCreatedToday(HttpContext.SelectedFacility()));
        }

        [HttpGet("upcomingUnconfirmed")]
        [Authorize]
        public async Task<ActionResult<List<AppointmentDTO>>> UpcomingUnconfirmed([FromQuery] int numberOfDays)
        {
            var endingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(numberOfDays)).ToString("yyyy-MM-dd");

            var filter = SmartFilter.And(
                SmartFilter.FromFieldFilter(nameof(Appointment.Status), Comparator.Equal, nameof(AppointmentStatus.Unconfirmed)),
                SmartFilter.FromFieldFilter(nameof(Appointment.Date), Comparator.LessThanOrEqual, endingDate)
            );

            var appointments = await appointmentService.GetList(DateOnly.FromDateTime(DateTime.UtcNow), Direction.Forwards, 0, 100, filter, HttpContext.SelectedFacility());

            return Ok(appointments.Select(a => a.GetDTO()));
        }
    }
}
