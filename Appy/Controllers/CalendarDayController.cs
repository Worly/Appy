using Microsoft.AspNetCore.Mvc;
using Appy.Auth;
using Appy.Services.Facilities;
using Appy.DTOs;
using Appy.Contracts;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class CalendarDayController : ControllerBase
    {
        private IAppointmentService appointmentService;
        private IWorkingHourService workingHourService;

        public CalendarDayController(IAppointmentService appointmentService, IWorkingHourService workingHourService)
        {
            this.appointmentService = appointmentService;
            this.workingHourService = workingHourService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public async Task<ActionResult<CalendarDayDTO>> GetAll([FromQuery] DateOnly date)
        {
            var appointments = await this.appointmentService.GetAll(date, HttpContext.SelectedFacility());
            var workingHours = await this.workingHourService.GetWorkingHours(date, HttpContext.SelectedFacility());

            return Ok(new CalendarDayDTO()
            {
                Date = date,
                Appointments = appointments.Select(a => a.GetDTO()).ToList(),
                WorkingHours = workingHours.ToList()
            });
        }
    }
}
