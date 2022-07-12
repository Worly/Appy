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
        public ActionResult<FacilityDTO> AddNew(FacilityDTO dto)
        {
            var result = this.facilityService.AddNew(dto, HttpContext.CurrentUser().Id);

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public ActionResult<FacilityDTO> Edit(int id, FacilityDTO dto)
        {
            var result = this.facilityService.Edit(HttpContext.CurrentUser().Id, id, dto);
            if (result == null)
                return NotFound();

            return Ok(result.GetDTO());
        }

        [HttpGet("getMy")]
        [Authorize]
        public ActionResult<List<FacilityDTO>> GetMy()
        {
            var result = this.facilityService.GetMy(HttpContext.CurrentUser().Id);

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public IActionResult Delete(int id)
        {
            if (this.facilityService.TryDelete(HttpContext.CurrentUser().Id, id))
                return Ok();
            else
                return NotFound();
        }

        [HttpPut("selectFacility")]
        [Authorize]
        public ActionResult SelectFacility([FromBody] int facilityId)
        {
            var facility = facilityService.GetById(HttpContext.CurrentUser().Id, facilityId);
            if (facility == null)
                return BadRequest();

            facilityService.SetSelectedFacility(HttpContext.CurrentUser().Id, facilityId);
            return Ok();
        }

        [HttpGet("getSelectedFacility")]
        [Authorize]
        public ActionResult<int?> GetSelectedFacility()
        {
            return Ok(facilityService.GetSelectedFacility(HttpContext.CurrentUser().Id));
        }
    }
}
