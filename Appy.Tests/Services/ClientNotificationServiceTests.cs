using Appy.Domain;
using Appy.Exceptions;
using Appy.Services;
using Appy.Services.MessagingServices;
using Moq;

namespace Appy.Tests.Services
{
    public class ClientNotificationServiceTests
    {
        private Mock<MainDbContext> dbContextMock;
        private Mock<IMessagingService> messagingServiceMock;
        private Mock<IMessagingServiceManager> messagingServiceManagerMock;
        private ClientNotificationsService service;

        private const string accessToken = "token";

        public ClientNotificationServiceTests()
        {
            dbContextMock = new Mock<MainDbContext>();
            messagingServiceMock = new Mock<IMessagingService>();

            messagingServiceMock.Setup(x => x.SendMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(true);
            messagingServiceMock.Setup(x => x.GetAppSpecificUserID(It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync("123");

            messagingServiceManagerMock = new Mock<IMessagingServiceManager>();

            messagingServiceManagerMock.Setup(x => x.IsSupported(It.IsAny<ContactType>())).Returns(true);
            messagingServiceManagerMock.Setup(x => x.GetAccessToken(It.IsAny<ContactType>(), It.IsAny<ClientNotificationsSettings>())).Returns(accessToken);
            messagingServiceManagerMock.Setup(x => x.GetService(It.IsAny<ContactType>())).Returns(messagingServiceMock.Object);

            service = new ClientNotificationsService(dbContextMock.Object, messagingServiceManagerMock.Object);
        }

        [Fact]
        public async Task SendMessageTo_ShouldThrow_WhenNoContacts()
        {
            var message = "message";

            await Assert.ThrowsAsync<BadRequestException>(() => service.SendMessageTo(new ClientNotificationsSettings(), new Client(), ""));

            await Assert.ThrowsAsync<BadRequestException>(() =>
                service.SendMessageTo(new ClientNotificationsSettings(), new Client { Contacts = new List<ClientContact>() }, message));
        }

        [Fact]
        public async Task SendMessageTo_Throws_WhenNoSupportedContact()
        {
            var message = "message";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.WhatsApp, Value = "123" }
                }
            };

            messagingServiceManagerMock.Setup(x => x.IsSupported(ContactType.WhatsApp)).Returns(false);

            await Assert.ThrowsAsync<BadRequestException>(() => service.SendMessageTo(new ClientNotificationsSettings(), client, message));
        }

        [Fact]
        public async Task SendMessageTo_Throws_WhenNoAccessToken()
        {
            var message = "message";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.Instagram, Value = "123" }
                }
            };

            messagingServiceManagerMock.Setup(x => x.GetAccessToken(ContactType.Instagram, It.IsAny<ClientNotificationsSettings>())).Returns("");

            await Assert.ThrowsAsync<BadRequestException>(() => service.SendMessageTo(new ClientNotificationsSettings(), client, message));
        }

        [Fact]
        public async Task SendMessageTo_Throws_WhenNoAppSpecificID()
        {
            var message = "message";
            var contactValue = "099123123123";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.Instagram, Value = contactValue }
                }
            };

            messagingServiceMock.Setup(x => x.GetAppSpecificUserID(accessToken, contactValue)).ReturnsAsync("");

            await Assert.ThrowsAsync<BadRequestException>(() => service.SendMessageTo(new ClientNotificationsSettings(), client, message));
        }

        [Fact]
        public async Task SendMessageTo_Throws_WhenSendMessageFails()
        {
            var message = "message";
            var appSpecificID = "12311111";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.Instagram, Value = "123", AppSpecificID = appSpecificID }
                }
            };

            messagingServiceMock.Setup(x => x.SendMessage(accessToken, appSpecificID, message)).ReturnsAsync(false);

            await Assert.ThrowsAsync<BadRequestException>(() => service.SendMessageTo(new ClientNotificationsSettings(), client, message));
        }

        [Fact]
        public async Task SendMessageTo_ShouldSendMessages()
        {
            var message = "message";
            var appSpecificID = "12311111";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.Instagram, Value = "123", AppSpecificID = appSpecificID }
                }
            };

            await service.SendMessageTo(new ClientNotificationsSettings(), client, message);

            messagingServiceMock.Verify(x => x.SendMessage(accessToken, appSpecificID, message), Times.Once);
        }

        [Fact]
        public async Task SendMessageTo_ShouldGetAppSpecificID()
        {
            var message = "message";
            var contactValue = "099123123123";
            var appSpecificID = "12311111";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.Instagram, Value = contactValue }
                }
            };

            messagingServiceMock.Setup(x => x.GetAppSpecificUserID(accessToken, contactValue)).ReturnsAsync(appSpecificID);

            await service.SendMessageTo(new ClientNotificationsSettings(), client, message);

            client.Contacts[0].AppSpecificID = appSpecificID;
            messagingServiceMock.Verify(x => x.GetAppSpecificUserID(accessToken, contactValue), Times.Once);

            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task SendMessageTo_ShouldSendMessageOnlyToFirstSuccessfulContact()
        {
            var message = "message";
            var appSpecificID1 = "12311111";
            var appSpecificID2 = "12311112";
            var client = new Client
            {
                Contacts = new List<ClientContact>
                {
                    new() { Type = ContactType.WhatsApp, Value = "123" }, // not supported
                    new() { Type = ContactType.Instagram, Value = "123", AppSpecificID = appSpecificID1 }, // will send to
                    new() { Type = ContactType.Instagram, Value = "123", AppSpecificID = appSpecificID2 } // will not send to
                }
            };

            messagingServiceManagerMock.Setup(x => x.IsSupported(ContactType.WhatsApp)).Returns(false);

            await service.SendMessageTo(new ClientNotificationsSettings(), client, message);

            messagingServiceMock.Verify(x => x.SendMessage(accessToken, appSpecificID1, message), Times.Once);
            messagingServiceMock.Verify(x => x.SendMessage(accessToken, appSpecificID2, message), Times.Never);
        }
    }
}
