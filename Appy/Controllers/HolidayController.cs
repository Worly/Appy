using Appy.Auth;
using Appy.DTOs;
using Appy.Services;
using Appy.Services.Facilities;
using Appy.Services.Holidays;
using Microsoft.AspNetCore.Mvc;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    [SelectedFacility]
    public class HolidayController : ControllerBase
    {
        private readonly IHolidayService holidayService;

        public HolidayController(IHolidayService holidayService)
        {
            this.holidayService = holidayService;
        }

        private static DateOnly Today => DateOnly.FromDateTime(DateTime.Today);

        [HttpGet("settings")]
        [Authorize]
        public async Task<ActionResult<HolidayImportSettingsDTO>> GetSettings()
        {
            var result = await holidayService.GetSettings(HttpContext.SelectedFacility());
            return Ok(result.GetDTO());
        }

        [HttpPut("settings")]
        [Authorize]
        public async Task<ActionResult<HolidayImportSettingsDTO>> SaveSettings(HolidayImportSettingsDTO dto)
        {
            var result = await holidayService.SaveSettings(HttpContext.SelectedFacility(), dto.CountryCode, Today);
            return Ok(result.GetDTO());
        }

        [HttpGet("getSupportedCountries")]
        [Authorize]
        public async Task<ActionResult<List<ProviderCountry>>> GetSupportedCountries()
        {
            return Ok(await holidayService.GetSupportedCountries());
        }

        [HttpGet("getList")]
        [Authorize]
        public async Task<ActionResult<List<HolidayDTO>>> GetList([FromQuery] TimeOffScope scope, [FromQuery] int skip, [FromQuery] int take)
        {
            var result = await holidayService.GetList(scope, skip, take, Today, HttpContext.SelectedFacility());
            return Ok(result);
        }

        [HttpGet("get/{id}")]
        [Authorize]
        public async Task<ActionResult<HolidayDTO>> Get(int id)
        {
            var result = await holidayService.GetById(id, HttpContext.SelectedFacility());
            if (result == null)
                return NotFound();
            return Ok(result);
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult> Edit(int id, HolidayEditDTO dto)
        {
            await holidayService.Edit(id, dto, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("remove/{id}")]
        [Authorize]
        public async Task<ActionResult> Remove(int id)
        {
            await holidayService.Remove(id, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("revert/{id}")]
        [Authorize]
        public async Task<ActionResult> Revert(int id)
        {
            await holidayService.Revert(id, HttpContext.SelectedFacility());
            return Ok();
        }

        [HttpPut("restore/{id}")]
        [Authorize]
        public async Task<ActionResult> Restore(int id)
        {
            await holidayService.Restore(id, HttpContext.SelectedFacility());
            return Ok();
        }
    }
}
