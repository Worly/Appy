using Appy.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace Appy.Tests.Middleware
{
    public class RequestLoggingMiddlewareTests
    {
        private static Mock<ILogger<RequestLoggingMiddleware>> VerifiableLogger()
        {
            var mock = new Mock<ILogger<RequestLoggingMiddleware>>();
            mock.Setup(x => x.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
            return mock;
        }

        private static void VerifyLogged(Mock<ILogger<RequestLoggingMiddleware>> logger, LogLevel level)
        {
            logger.Verify(x => x.Log(
                level,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                (Func<It.IsAnyType, Exception?, string>)It.IsAny<object>()),
                Times.Once);
        }

        private static void VerifyNeverLogged(Mock<ILogger<RequestLoggingMiddleware>> logger)
        {
            logger.Verify(x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                (Func<It.IsAnyType, Exception?, string>)It.IsAny<object>()),
                Times.Never);
        }

        [Fact]
        public async Task Invoke_LogsInformation_OnSuccess()
        {
            var logger = VerifiableLogger();
            var middleware = new RequestLoggingMiddleware(ctx => { ctx.Response.StatusCode = 200; return Task.CompletedTask; }, logger.Object);
            var context = new DefaultHttpContext();
            context.Request.Method = "GET";
            context.Request.Path = "/api/test";

            await middleware.Invoke(context);

            VerifyLogged(logger, LogLevel.Information);
        }

        [Fact]
        public async Task Invoke_LogsError_OnServerError()
        {
            var logger = VerifiableLogger();
            var middleware = new RequestLoggingMiddleware(ctx => { ctx.Response.StatusCode = 500; return Task.CompletedTask; }, logger.Object);
            var context = new DefaultHttpContext();
            context.Request.Method = "POST";
            context.Request.Path = "/api/test";

            await middleware.Invoke(context);

            VerifyLogged(logger, LogLevel.Error);
        }

        [Fact]
        public async Task Invoke_DoesNotLog_OnHealthyHealthCheck()
        {
            var logger = VerifiableLogger();
            var middleware = new RequestLoggingMiddleware(ctx => { ctx.Response.StatusCode = 200; return Task.CompletedTask; }, logger.Object);
            var context = new DefaultHttpContext();
            context.Request.Method = "GET";
            context.Request.Path = "/health";

            await middleware.Invoke(context);

            VerifyNeverLogged(logger);
        }

        [Fact]
        public async Task Invoke_LogsError_OnFailedHealthCheck()
        {
            var logger = VerifiableLogger();
            var middleware = new RequestLoggingMiddleware(ctx => { ctx.Response.StatusCode = 503; return Task.CompletedTask; }, logger.Object);
            var context = new DefaultHttpContext();
            context.Request.Method = "GET";
            context.Request.Path = "/health";

            await middleware.Invoke(context);

            VerifyLogged(logger, LogLevel.Error);
        }
    }
}
