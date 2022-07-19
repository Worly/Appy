using Appy.DTOs;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;

namespace Appy.Exceptions
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger _logger;
        private readonly IOptions<JsonOptions> jsonOptions;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IOptions<JsonOptions> jsonOptions)
        {
            _logger = logger;
            _next = next;
            jsonOptions = jsonOptions;
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
                text = JsonSerializer.Serialize(new ErrorBuilder().Add(validationException.PropertyName, validationException.ErrorCode), new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            else
                text = JsonSerializer.Serialize(new ErrorDetails() { StatusCode = context.Response.StatusCode, Message = exception.Message }, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

            context.Response.StatusCode = (int)statusCode;
            await context.Response.WriteAsync(text);
        }

        private class ErrorDetails
        {
            public int StatusCode { get; set; }
            public string Message { get; set; }
        }
    }
}
