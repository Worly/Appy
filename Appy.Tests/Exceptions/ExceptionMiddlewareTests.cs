using System.Net;
using System.Text;
using Appy.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace Appy.Tests.Exceptions
{
    public class ExceptionMiddlewareTests
    {
        private static void VerifyLogged(Mock<ILogger<ExceptionMiddleware>> logger, LogLevel level)
        {
            logger.Verify(x => x.Log(
                level,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception?>(),
                (Func<It.IsAnyType, Exception?, string>)It.IsAny<object>()),
                Times.Once);
        }

        private static DefaultHttpContext ContextWithBody()
        {
            var context = new DefaultHttpContext();
            context.Request.Method = "POST";
            context.Request.Path = "/api/test";
            context.Response.Body = new MemoryStream();
            return context;
        }

        private static string ReadBody(HttpContext context)
        {
            context.Response.Body.Position = 0;
            return new StreamReader(context.Response.Body, Encoding.UTF8).ReadToEnd();
        }

        [Fact]
        public async Task ClientError_LogsInformation_AndWritesStatusAndMessage()
        {
            var logger = new Mock<ILogger<ExceptionMiddleware>>();
            logger.Setup(x => x.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
            var middleware = new ExceptionMiddleware(
                _ => throw new BadRequestException("BAD"), logger.Object);
            var context = ContextWithBody();

            await middleware.InvokeAsync(context);

            Assert.Equal((int)HttpStatusCode.BadRequest, context.Response.StatusCode);
            Assert.Equal("BAD", ReadBody(context));
            VerifyLogged(logger, LogLevel.Information);
        }

        [Fact]
        public async Task UnhandledException_LogsError_AndReturnsGeneric500()
        {
            var logger = new Mock<ILogger<ExceptionMiddleware>>();
            logger.Setup(x => x.IsEnabled(It.IsAny<LogLevel>())).Returns(true);
            var middleware = new ExceptionMiddleware(
                _ => throw new InvalidOperationException("secret details"), logger.Object);
            var context = ContextWithBody();

            await middleware.InvokeAsync(context);

            Assert.Equal(500, context.Response.StatusCode);
            Assert.DoesNotContain("secret details", ReadBody(context));
            VerifyLogged(logger, LogLevel.Error);
        }
    }
}
