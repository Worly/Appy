using Appy.Services;
using Microsoft.AspNetCore.Mvc;

namespace Appy.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class TestingController : ControllerBase
    {
        private ITestingService testingService;

        public TestingController(ITestingService testingService)
        {
            this.testingService = testingService;
        }

        [HttpPost("seed")]
        public async Task Seed()
        {
            await testingService.Seed();
        }
    }
}
