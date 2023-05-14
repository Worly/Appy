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
        public async Task<ActionResult<List<AppointmentDTO>>> GetAll([FromQuery] DateOnly date)
        {
            var result = await this.appointmentService.GetAll(date, HttpContext.SelectedFacility());

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("getList")]
        [Authorize]
        public async Task<ActionResult<List<AppointmentDTO>>> GetList([FromQuery] DateOnly date, [FromQuery] Direction direction, [FromQuery] int skip, [FromQuery] int take)
        {
            var result = await this.appointmentService.GetList(date, direction, skip, take, HttpContext.SelectedFacility());

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("get/{id}")]
        [Authorize]
        public async Task<ActionResult<AppointmentDTO>> Get(int id)
        {
            var result = await this.appointmentService.GetById(id, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPost("addNew")]
        [Authorize]
        public async Task<ActionResult<AppointmentDTO>> AddNew(AppointmentDTO dto, [FromQuery] bool ignoreTimeNotAvailable = false)
        {
            var result = await this.appointmentService.AddNew(dto, HttpContext.SelectedFacility(), ignoreTimeNotAvailable);

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult<AppointmentDTO>> Edit(int id, AppointmentDTO dto, [FromQuery] bool ignoreTimeNotAvailable = false)
        {
            var result = await this.appointmentService.Edit(id, dto, HttpContext.SelectedFacility(), ignoreTimeNotAvailable);

            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<ActionResult> Delete(int id)
        {
            await this.appointmentService.Delete(id, HttpContext.SelectedFacility());

            return Ok();
        }

        [HttpGet("getFreeTimes")]
        [Authorize]
        public async Task<ActionResult<List<FreeTimeDTO>>> GetFreeTimes([FromQuery] DateOnly date, [FromQuery] int serviceId, [FromQuery] TimeSpan duration, [FromQuery] int? ignoreAppointmentId)
        {
            var service = await this.serviceService.GetById(serviceId, HttpContext.SelectedFacility());
            var appointmentsOfTheDay = await this.appointmentService.GetAll(date, HttpContext.SelectedFacility());
            var workingHours = await this.workingHourService.GetWorkingHours(date, HttpContext.SelectedFacility());

            if (ignoreAppointmentId.HasValue)
                appointmentsOfTheDay = appointmentsOfTheDay.Where(o => o.Id != ignoreAppointmentId).ToList();

            return this.appointmentService.GetFreeTimes(appointmentsOfTheDay, workingHours, service, duration);
        }
    }
}
