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

        [HttpGet("upcomingUnconfirmed")]
        [Authorize]
        public async Task<ActionResult<List<AppointmentDTO>>> UpcomingUnconfirmed()
        {
            var endingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)).ToString("yyyy-MM-dd");

            var filter = SmartFilter.And(
                SmartFilter.FromFieldFilter(nameof(Appointment.Status), Comparator.Equal, nameof(AppointmentStatus.Unconfirmed)),
                SmartFilter.FromFieldFilter(nameof(Appointment.Date), Comparator.LessThan, endingDate)
            );

            var appointments = await appointmentService.GetList(DateOnly.FromDateTime(DateTime.UtcNow), Direction.Forwards, 0, 100, filter, HttpContext.SelectedFacility());

            return Ok(appointments.Select(a => a.GetDTO()));
        }
    }
}
