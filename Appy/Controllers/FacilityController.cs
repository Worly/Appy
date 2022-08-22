using Microsoft.AspNetCore.Mvc;
using Appy.Auth;
using Appy.Services.Facilities;
using Appy.DTOs;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class FacilityController : ControllerBase
    {
        private IFacilityService facilityService;

        public FacilityController(IFacilityService facilityService)
        {
            this.facilityService = facilityService;
        }

        [HttpPost("addNew")]
        [Authorize]
        public async Task<ActionResult<FacilityDTO>> AddNew(FacilityDTO dto)
        {
            var result = await this.facilityService.AddNew(dto, HttpContext.CurrentUser().Id);

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult<FacilityDTO>> Edit(int id, FacilityDTO dto)
        {
            var result = await this.facilityService.Edit(HttpContext.CurrentUser().Id, id, dto);

            return Ok(result.GetDTO());
        }

        [HttpGet("getMy")]
        [Authorize]
        public async Task<ActionResult<List<FacilityDTO>>> GetMy()
        {
            var result = await this.facilityService.GetMy(HttpContext.CurrentUser().Id);

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<ActionResult> Delete(int id)
        {
            await this.facilityService.Delete(HttpContext.CurrentUser().Id, id);

            return Ok();
        }

        [HttpPut("selectFacility")]
        [Authorize]
        public async Task<ActionResult> SelectFacility([FromBody] int facilityId)
        {
            await facilityService.SetSelectedFacility(HttpContext.CurrentUser().Id, facilityId);

            return Ok();
        }

        [HttpGet("getSelectedFacility")]
        [Authorize]
        public async Task<ActionResult<int?>> GetSelectedFacility()
        {
            var selectedFacilityId = await facilityService.GetSelectedFacility(HttpContext.CurrentUser().Id);

            return Ok(selectedFacilityId);
        }
    }
}
