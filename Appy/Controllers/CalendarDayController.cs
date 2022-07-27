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
        public ActionResult<CalendarDayDTO> GetAll([FromQuery] DateOnly date)
        {
            var appointments = this.appointmentService.GetAll(date, HttpContext.SelectedFacility());
            var workingHours = this.workingHourService.GetWorkingHours(date, HttpContext.SelectedFacility());

            return Ok(new CalendarDayDTO()
            {
                Appointments = appointments.Select(a => a.GetDTO()).ToList(),
                WorkingHours = workingHours.Select(w => w.GetDTO()).ToList()
            });
        }
    }
}
