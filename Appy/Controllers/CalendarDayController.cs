using Microsoft.AspNetCore.Mvc;
using Appy.Auth;
using Appy.Services.Facilities;
using Appy.DTOs;
using Appy.Services;
using Appy.Services.SmartFiltering;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class CalendarDayController : ControllerBase
    {
        private IAppointmentService appointmentService;
        private IWorkingHourService workingHourService;
        private ITimeOffService timeOffService;

        public CalendarDayController(IAppointmentService appointmentService, IWorkingHourService workingHourService, ITimeOffService timeOffService)
        {
            this.appointmentService = appointmentService;
            this.workingHourService = workingHourService;
            this.timeOffService = timeOffService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public async Task<ActionResult<CalendarDayDTO>> GetAll([FromQuery] DateOnly date, [FromQuery] SmartFilter? filter)
        {
            var appointments = await this.appointmentService.GetAll(date, HttpContext.SelectedFacility(), findPrevious: true, filter);
            var workingHours = await this.workingHourService.GetWorkingHours(date, HttpContext.SelectedFacility());
            var timeOffs = await this.timeOffService.GetOccurrencesForDate(date, HttpContext.SelectedFacility());

            return Ok(new CalendarDayDTO()
            {
                Date = date,
                Appointments = appointments,
                WorkingHours = workingHours.Select(w => w.GetDTO()).ToList(),
                TimeOffs = timeOffs
            });
        }
    }
}
