namespace Appy.Services.Facilities
{
    public class FacilityMiddleware
    {
        private readonly RequestDelegate _next;

        public FacilityMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            if (int.TryParse(context.Request.Headers["facility-id"].FirstOrDefault(), out int facilityId))
                context.Items["facilityId"] = facilityId;

            await _next(context);
        }
    }
}
