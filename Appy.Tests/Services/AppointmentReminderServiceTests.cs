using Appy.Domain;
using Appy.DTOs;
using Appy.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.EntityFrameworkCore;
using System.Globalization;

namespace Appy.Tests.Services
{
    public class AppointmentReminderServiceTests
    {
        private Mock<MainDbContext> dbContextMock;
        private Mock<IClientNotificationsService> clientNotificationsServiceMock;
        private AppointmentReminderService service;

        private static readonly DateOnly today = new DateOnly(2020, 1, 1);
        private static readonly DateOnly tomorrow = new DateOnly(2020, 1, 2);

        private static readonly DateTime reminderTime = new DateTime(2024, 1, 1, 11, 0, 0);
        private static readonly DateTime afterReminderTime = new DateTime(2024, 1, 1, 11, 0, 1);
        private static readonly DateTime beforeReminderTime = new DateTime(2024, 1, 1, 10, 0, 59);

        private readonly int facilityId = 1;
        private ClientNotificationsSettings clientNotificationsSettings = new ClientNotificationsSettings()
        {
            AppointmentReminderMessageTemplate = "Message",
            AppointmentReminderTime = new DateTime(2024, 1, 1, 11, 0, 0),
            InstagramAPIAccessToken = "Token"
        };

        private Client client1 = new() { Id = 1, Contacts = new() };
        private Client client2 = new() { Id = 2, Contacts = new() };

        private Service service1 = new() { Id = 1 };

        private List<Appointment> appointments = new List<Appointment>();
        private int _nextId = 1;

        public AppointmentReminderServiceTests()
        {
            var logger = new Mock<ILogger<AppointmentReminderService>>();
            dbContextMock = new Mock<MainDbContext>();
            clientNotificationsServiceMock = new Mock<IClientNotificationsService>();

            var facility = new Facility()
            {
                Id = facilityId,
                ClientNotificationsSettings = clientNotificationsSettings
            };

            dbContextMock.Setup(x => x.Facilities).ReturnsDbSet(new List<Facility> { facility });
            dbContextMock.Setup(x => x.Appointments).ReturnsDbSet(appointments);

            service = new AppointmentReminderService(logger.Object, dbContextMock.Object, clientNotificationsServiceMock.Object);
        }

        private Appointment AddAppointment(DateOnly date, Client client, AppointmentStatus status)
        {
            var ap = new Appointment()
            {
                Id = _nextId++,
                FacilityId = facilityId,
                Date = date,
                Client = client,
                Service = service1,
                Status = status
            };

            appointments.Add(ap);

            return ap;
        }

        public static TheoryData<DateTime, bool> RemindFor_ShouldRemind_WhenTimeIsRight_TestCases() => new()
        {
            { beforeReminderTime, false },
            { reminderTime, true },
            { afterReminderTime, true }
        };

        [Theory]
        [MemberData(nameof(RemindFor_ShouldRemind_WhenTimeIsRight_TestCases))]
        public async Task RemindFor_ShouldRemind_WhenTimeIsRight(DateTime now, bool shouldRemind)
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);

            // Act
            await service.RemindFor(today, now);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(client1.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), shouldRemind ? Times.Once : Times.Never);
        }

        [Fact]
        public async Task RemindFor_ShouldSetWasReminded()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(client1.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Once);

            Assert.True(appointment1.WasReminded);

            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RemindFor_ShouldNotRemind_WhenAppointmentIsNotConfirmed()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Unconfirmed);

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Never);
        }

        [Fact]
        public async Task RemindFor_ShouldNotRemind_WhenAppointmentWasAlreadyRemindedFor()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);
            appointment1.WasReminded = true;

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Never);
        }

        [Fact]
        public async Task RemindFor_ShouldNotRemind_WhenMessageTemplateIsNotSet()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);

            clientNotificationsSettings.AppointmentReminderMessageTemplate = "";

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Never);
        }

        [Fact]
        public async Task RemindFor_ShouldNotRemind_WhenReminderTimeIsNotSet()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);

            clientNotificationsSettings.AppointmentReminderTime = null;

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Never);
        }

        [Fact]
        public async Task RemindFor_ShouldNotRemind_WhenWrongDate()
        {
            // Arrange
            var appointment1 = AddAppointment(tomorrow, client1, AppointmentStatus.Confirmed);

            clientNotificationsSettings.AppointmentReminderTime = null;

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Never);
        }

        [Fact]
        public async Task RemindFor_Complex()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);
            var appointment2 = AddAppointment(tomorrow, client2, AppointmentStatus.Confirmed); // wrong date
            var appointment3 = AddAppointment(today, client2, AppointmentStatus.Unconfirmed); // wrong status
            var appointment4 = AddAppointment(today, client2, AppointmentStatus.Confirmed);
            var appointment5 = AddAppointment(today, client2, AppointmentStatus.Confirmed); // already reminded
            appointment5.WasReminded = true;

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(client1.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Once);
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment2.Id), It.IsAny<CultureInfo>()), Times.Never);
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment3.Id), It.IsAny<CultureInfo>()), Times.Never);
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(client2.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment4.Id), It.IsAny<CultureInfo>()), Times.Once);
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(It.IsAny<int>(), It.Is<AppointmentViewDTO>(d => d.Id == appointment5.Id), It.IsAny<CultureInfo>()), Times.Never);
        }

        [Fact]
        public async Task RemindFor_ShouldHandleExceptions()
        {
            // Arrange
            var appointment1 = AddAppointment(today, client1, AppointmentStatus.Confirmed);
            var appointment2 = AddAppointment(today, client2, AppointmentStatus.Confirmed);

            clientNotificationsServiceMock.Setup(x => x.SendAppointmentReminderMessage(client1.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()))
                .Throws(new Exception());

            // Act
            await service.RemindFor(today, afterReminderTime);

            // Assert
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(client1.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment1.Id), It.IsAny<CultureInfo>()), Times.Once);
            clientNotificationsServiceMock.Verify(
                x => x.SendAppointmentReminderMessage(client2.Id, It.Is<AppointmentViewDTO>(d => d.Id == appointment2.Id), It.IsAny<CultureInfo>()), Times.Once);

            Assert.False(appointment1.WasReminded); // because an exception was thrown
            Assert.True(appointment2.WasReminded);

            dbContextMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
