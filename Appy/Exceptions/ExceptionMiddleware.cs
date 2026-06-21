namespace Appy.Exceptions
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _logger = logger;
            _next = next;
        }

        public async Task InvokeAsync(HttpContext httpContext)
        {
            try
            {
                await _next(httpContext);
            }
            catch (HttpException ex)
            {
                var statusCode = (int)ex.StatusCode;
                if (statusCode >= 500)
                    _logger.LogError(ex, "Request failed: {Method} {Path} -> {StatusCode}",
                        httpContext.Request.Method, httpContext.Request.Path.Value, statusCode);
                else
                    _logger.LogInformation("Request rejected: {Method} {Path} -> {StatusCode} ({Message})",
                        httpContext.Request.Method, httpContext.Request.Path.Value, statusCode, ex.Message);

                httpContext.Response.ContentType = "application/json";
                httpContext.Response.StatusCode = statusCode;
                await httpContext.Response.WriteAsync(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception: {Method} {Path}",
                    httpContext.Request.Method, httpContext.Request.Path.Value);

                httpContext.Response.ContentType = "application/json";
                httpContext.Response.StatusCode = 500;
                await httpContext.Response.WriteAsync("An unexpected error occurred");
            }
        }
    }
}
