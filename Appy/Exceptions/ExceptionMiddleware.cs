using Appy.DTOs;
using System.Net;
using System.Text.Json;

namespace Appy.Exceptions
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger _logger;
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
            catch (Exception ex)
            {
                _logger.LogError($"Something went wrong: {ex}");
                await HandleExceptionAsync(httpContext, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";

            var statusCode = exception switch
            {
                NotFoundException => HttpStatusCode.NotFound,
                ValidationException => HttpStatusCode.BadRequest,
                _ => HttpStatusCode.InternalServerError
            };

            string text;

            if (exception is ValidationException validationException)
                text = JsonSerializer.Serialize(new ErrorBuilder().Add(validationException.PropertyName, validationException.ErrorCode));
            else
                text = new ErrorDetails()
                {
                    StatusCode = context.Response.StatusCode,
                    Message = exception.Message,
                }.ToString();

            context.Response.StatusCode = (int)statusCode;
            await context.Response.WriteAsync(text);
        }

        private class ErrorDetails
        {
            public int StatusCode { get; set; }
            public string Message { get; set; }
            public override string ToString()
            {
                return JsonSerializer.Serialize(this);
            }
        }
    }
}
