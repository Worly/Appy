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

        public AppointmentController(IAppointmentService appointmentService)
        {
            this.appointmentService = appointmentService;
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
        public ActionResult<AppointmentDTO> AddNew(AppointmentDTO dto)
        {
            var result = this.appointmentService.AddNew(dto, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public ActionResult<AppointmentDTO> Edit(int id, AppointmentDTO dto)
        {
            var result = this.appointmentService.Edit(id, dto, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public void Delete(int id)
        {
            this.appointmentService.Delete(id, HttpContext.SelectedFacility());
        }
    }
}
