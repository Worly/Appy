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
    public class TimeOffController : ControllerBase
    {
        private readonly ITimeOffService timeOffService;

        public TimeOffController(ITimeOffService timeOffService)
        {
            this.timeOffService = timeOffService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public async Task<ActionResult<List<TimeOffDTO>>> GetAll()
        {
            var result = await this.timeOffService.GetAll(HttpContext.SelectedFacility());
            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("get/{id}")]
        [Authorize]
        public async Task<ActionResult<TimeOffDTO>> Get(int id)
        {
            var result = await this.timeOffService.GetById(id, HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }

        [HttpPost("addNew")]
        [Authorize]
        public async Task<ActionResult<TimeOffDTO>> AddNew(TimeOffDTO dto)
        {
            var result = await this.timeOffService.AddNew(dto, HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult<TimeOffDTO>> Edit(int id, TimeOffDTO dto)
        {
            var result = await this.timeOffService.Edit(id, dto, HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<ActionResult> Delete(int id)
        {
            await this.timeOffService.Delete(id, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpGet("getForDate")]
        [Authorize]
        public async Task<ActionResult<List<TimeOffOccurrenceDTO>>> GetForDate([FromQuery] DateOnly date)
        {
            var result = await this.timeOffService.GetOccurrencesForDate(date, HttpContext.SelectedFacility());
            return Ok(result);
        }

        [HttpGet("getForRange")]
        [Authorize]
        public async Task<ActionResult<List<TimeOffOccurrenceDTO>>> GetForRange([FromQuery] DateOnly from, [FromQuery] DateOnly to)
        {
            var result = await this.timeOffService.GetOccurrencesForRange(from, to, HttpContext.SelectedFacility());
            return Ok(result);
        }
    }
}
