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
    public class ServiceController : ControllerBase
    {
        private IServiceService serviceService;

        public ServiceController(IServiceService serviceService)
        {
            this.serviceService = serviceService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public async Task<ActionResult<List<ServiceDTO>>> GetAll()
        {
            var result = await this.serviceService.GetAll(HttpContext.SelectedFacility());

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("get/{id}")]
        [Authorize]
        public async Task<ActionResult<ServiceDTO>> Get(int id)
        {
            var result = await this.serviceService.GetById(id, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPost("addNew")]
        [Authorize]
        public async Task<ActionResult<ServiceDTO>> AddNew(ServiceDTO dto)
        {
            var result = await this.serviceService.AddNew(dto, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult<ServiceDTO>> Edit(int id, ServiceDTO dto)
        {
            var result = await this.serviceService.Edit(id, dto, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<ActionResult> Delete(int id)
        {
            await this.serviceService.Delete(id, HttpContext.SelectedFacility());

            return Ok();
        }
    }
}
