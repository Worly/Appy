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
    public class ClientController : ControllerBase
    {
        private IClientService clientService;

        public ClientController(IClientService clientService)
        {
            this.clientService = clientService;
        }

        [HttpGet("getAll")]
        [Authorize]
        public async Task<ActionResult<List<ClientDTO>>> GetAll([FromQuery] bool archived)
        {
            var result = await this.clientService.GetAll(HttpContext.SelectedFacility(), archived);

            return Ok(result.Select(o => o.GetDTO()));
        }

        [HttpGet("get/{id}")]
        [Authorize]
        public async Task<ActionResult<ClientDTO>> Get(int id)
        {
            var result = await this.clientService.GetById(id, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPost("addNew")]
        [Authorize]
        public async Task<ActionResult<ClientDTO>> AddNew(ClientDTO dto)
        {
            var result = await this.clientService.AddNew(dto, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpPut("edit/{id}")]
        [Authorize]
        public async Task<ActionResult<ClientDTO>> Edit(int id, ClientDTO dto)
        {
            var result = await this.clientService.Edit(id, dto, HttpContext.SelectedFacility());

            return Ok(result.GetDTO());
        }

        [HttpDelete("delete/{id}")]
        [Authorize]
        public async Task<ActionResult> Delete(int id)
        {
            await this.clientService.Delete(id, HttpContext.SelectedFacility());

            return Ok();
        }

        [HttpPost("setArchived/{id}")]
        [Authorize]
        public async Task<ActionResult<ClientDTO>> SetArchived(int id, [FromQuery] bool isArchived)
        {
            var result = await this.clientService.SetArchive(id, HttpContext.SelectedFacility(), isArchived);

            return Ok(result.GetDTO());
        }
    }
}
