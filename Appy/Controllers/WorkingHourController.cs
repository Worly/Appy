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
    public class WorkingHourController : ControllerBase
    {
        private readonly IWorkingHourService workingHourService;

        public WorkingHourController(IWorkingHourService workingHourService)
        {
            this.workingHourService = workingHourService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public async Task<ActionResult<List<WorkingHourDTO>>> GetAll()
        {
            var result = await this.workingHourService.GetAll(HttpContext.SelectedFacility());

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("getFor")]
        [Authorize]
        public async Task<ActionResult<List<WorkingHourDTO>>> GetFor([FromQuery] DateOnly date)
        {
            var result = await this.workingHourService.GetWorkingHours(date, HttpContext.SelectedFacility());

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpPost("set")]
        [Authorize]
        public async Task<ActionResult> Set(List<WorkingHourDTO> workingHours)
        {
            await this.workingHourService.SetWorkingHours(workingHours, HttpContext.SelectedFacility());

            return Ok();
        }
    }
}
