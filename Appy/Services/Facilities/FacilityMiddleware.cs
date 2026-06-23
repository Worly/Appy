namespace Appy.Services.Facilities
{
    public class FacilityMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<FacilityMiddleware> _logger;

        public FacilityMiddleware(RequestDelegate next, ILogger<FacilityMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task Invoke(HttpContext context)
        {
            if (int.TryParse(context.Request.Headers["facility-id"].FirstOrDefault(), out int facilityId))
            {
                context.Items["facilityId"] = facilityId;
                using (_logger.BeginScope(new Dictionary<string, object> { ["FacilityId"] = facilityId }))
                {
                    await _next(context);
                }
                return;
            }

            await _next(context);
        }
    }
}
