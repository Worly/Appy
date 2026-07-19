using System.Diagnostics;

namespace Appy.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task Invoke(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();

            using (_logger.BeginScope(new Dictionary<string, object>
            {
                ["RequestId"] = context.TraceIdentifier
            }))
            {
                try
                {
                    await _next(context);
                }
                finally
                {
                    stopwatch.Stop();

                    var statusCode = context.Response.StatusCode;

                    // Health checks poll every few seconds; logging every success drowns the log.
                    // Keep failures, which signal the container going unhealthy.
                    var isHealthyHealthCheck = statusCode < 500 && context.Request.Path.StartsWithSegments("/health");

                    if (!isHealthyHealthCheck)
                    {
                        var level = statusCode >= 500 ? LogLevel.Error : LogLevel.Information;

                        _logger.Log(level, "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                            context.Request.Method,
                            context.Request.Path.Value,
                            statusCode,
                            stopwatch.ElapsedMilliseconds);
                    }
                }
            }
        }
    }
}
