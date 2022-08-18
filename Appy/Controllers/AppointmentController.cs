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
    public class AppointmentController : ControllerBase
    {
        private IAppointmentService appointmentService;
        private IServiceService serviceService;
        private IWorkingHourService workingHourService;

        public AppointmentController(IAppointmentService appointmentService, IServiceService serviceService, IWorkingHourService workingHourService)
        {
            this.appointmentService = appointmentService;
            this.serviceService = serviceService;
            this.workingHourService = workingHourService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public ActionResult<List<AppointmentDTO>> GetAll([FromQuery] DateOnly date)
        {
            var result = this.appointmentService.GetAll(date, HttpContext.SelectedFacility());

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("get/{id}")]
        [Authorize]
        public ActionResult<AppointmentDTO> Get(int id)
        {
            var result = this.appointmentService.GetById(id, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPost("addNew")]
        [Authorize]
        public ActionResult<AppointmentDTO> AddNew(AppointmentDTO dto, [FromQuery] bool ignoreTimeNotAvailable = false)
        {
            var result = this.appointmentService.AddNew(dto, HttpContext.SelectedFacility(), ignoreTimeNotAvailable);

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public ActionResult<AppointmentDTO> Edit(int id, AppointmentDTO dto, [FromQuery] bool ignoreTimeNotAvailable = false)
        {
            var result = this.appointmentService.Edit(id, dto, HttpContext.SelectedFacility(), ignoreTimeNotAvailable);

            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public void Delete(int id)
        {
            this.appointmentService.Delete(id, HttpContext.SelectedFacility());
        }

        [HttpGet("getFreeTimes")]
        [Authorize]
        public ActionResult<List<FreeTimeDTO>> GetFreeTimes([FromQuery] DateOnly date, [FromQuery] int serviceId, [FromQuery] TimeSpan duration, [FromQuery] int? ignoreAppointmentId)
        {
            var service = this.serviceService.GetById(serviceId, HttpContext.SelectedFacility());
            var appointmentsOfTheDay = this.appointmentService.GetAll(date, HttpContext.SelectedFacility());
            var workingHours = this.workingHourService.GetWorkingHours(date, HttpContext.SelectedFacility());

            if (ignoreAppointmentId.HasValue)
                appointmentsOfTheDay = appointmentsOfTheDay.Where(o => o.Id != ignoreAppointmentId).ToList();

            return this.appointmentService.GetFreeTimes(appointmentsOfTheDay, workingHours, service, duration);
        }
    }
}
