using System.Security.Claims;
using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Appy.Services;
using Moq;
using Moq.EntityFrameworkCore;

namespace Appy.Tests.Services
{
    public class UserServiceTests
    {
        private readonly Mock<MainDbContext> dbContextMock;
        private readonly Mock<IJwtService> jwtServiceMock;
        private readonly UserService service;

        private readonly List<User> users = new();

        public UserServiceTests()
        {
            dbContextMock = new Mock<MainDbContext>();
            jwtServiceMock = new Mock<IJwtService>();

            dbContextMock.Setup(x => x.Users).ReturnsDbSet(users);
            dbContextMock.Setup(x => x.LoginSessions).ReturnsDbSet(new List<LoginSession>());
            jwtServiceMock.Setup(x => x.GenerateToken(It.IsAny<TimeSpan>(), It.IsAny<Claim[]>())).Returns("token");

            service = new UserService(dbContextMock.Object, jwtServiceMock.Object);
        }

        private static RegisterDTO RegisterWith(string email) => new RegisterDTO
        {
            Email = email,
            Name = "John",
            Surname = "Doe",
            Password = "password123"
        };

        [Theory]
        [InlineData("notanemail")]
        [InlineData("@")]
        [InlineData("user@")]
        [InlineData("@domain.com")]
        [InlineData("user@ domain.com")]
        [InlineData("")]
        public async Task Register_ThrowsValidationException_WhenEmailIsMalformed(string email)
        {
            await Assert.ThrowsAsync<ValidationException>(
                () => service.Register(RegisterWith(email), "agent"));
        }

        [Fact]
        public async Task Register_RejectsMalformedEmail_BeforeCheckingUniqueness()
        {
            // The DB has no users, yet a malformed email must still be rejected —
            // format validation must run regardless of the uniqueness check.
            Assert.Empty(users);

            await Assert.ThrowsAsync<ValidationException>(
                () => service.Register(RegisterWith("notanemail"), "agent"));
        }

        [Fact]
        public async Task Register_Succeeds_WhenEmailIsWellFormed()
        {
            var result = await service.Register(RegisterWith("user@domain.com"), "agent");

            Assert.NotNull(result.AccessToken);
            Assert.NotNull(result.RefreshToken);
        }
    }
}
