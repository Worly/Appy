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
        public async Task<ActionResult<TimeOffDTO>> Edit(int id, TimeOffDTO dto, [FromQuery] DateOnly? applyFrom = null)
        {
            var result = await this.timeOffService.Edit(id, dto, HttpContext.SelectedFacility(), applyFrom);
            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<ActionResult> Delete(int id)
        {
            await this.timeOffService.Delete(id, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("stop/{id}")]
        [Authorize]
        public async Task<ActionResult<TimeOffDTO>> StopRecurring(int id)
        {
            var result = await this.timeOffService.StopRecurring(id, HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }

        [HttpGet("getList")]
        [Authorize]
        public async Task<ActionResult<List<TimeOffDTO>>> GetList(
            [FromQuery] TimeOffListType type, [FromQuery] TimeOffScope scope, [FromQuery] int skip, [FromQuery] int take)
        {
            var result = await this.timeOffService.GetList(type, scope, skip, take, HttpContext.SelectedFacility());
            return Ok(result);
        }

    }
}
