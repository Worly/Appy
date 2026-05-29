using Appy.Domain;
using Appy.DTOs;
using Appy.Services;
using Moq;
using Moq.EntityFrameworkCore;

namespace Appy.Tests.Services
{
    public class AppointmentServiceTests
    {
        private const int FacilityId = 1;

        private readonly Mock<MainDbContext> dbContextMock;
        private readonly Mock<IWorkingHourService> workingHourServiceMock;
        private readonly AppointmentService service;

        private readonly Service service1 = new() { Id = 1, FacilityId = FacilityId, Name = "S1", DisplayName = "S1", Duration = TimeSpan.FromMinutes(30) };
        private readonly Service service2 = new() { Id = 2, FacilityId = FacilityId, Name = "S2", DisplayName = "S2", Duration = TimeSpan.FromMinutes(30) };

        private readonly Client client1 = new() { Id = 1, FacilityId = FacilityId, Name = "C1", Contacts = new() };
        private readonly Client client2 = new() { Id = 2, FacilityId = FacilityId, Name = "C2", Contacts = new() };

        private readonly List<Appointment> appointments = new();

        public AppointmentServiceTests()
        {
            dbContextMock = new Mock<MainDbContext>();
            workingHourServiceMock = new Mock<IWorkingHourService>();

            dbContextMock.Setup(x => x.Appointments).ReturnsDbSet(appointments);
            dbContextMock.Setup(x => x.Services).ReturnsDbSet(new List<Service> { service1, service2 });
            dbContextMock.Setup(x => x.Clients).ReturnsDbSet(new List<Client> { client1, client2 });

            var allDays = Enum.GetValues(typeof(DayOfWeek)).Cast<DayOfWeek>()
                .Select(d => new WorkingHour
                {
                    FacilityId = FacilityId,
                    DayOfWeek = d,
                    TimeFrom = new TimeOnly(0, 0),
                    TimeTo = new TimeOnly(23, 55)
                })
                .ToList();
            workingHourServiceMock
                .Setup(x => x.GetWorkingHours(It.IsAny<DateOnly>(), FacilityId))
                .ReturnsAsync(allDays);

            service = new AppointmentService(dbContextMock.Object, workingHourServiceMock.Object);
        }

        private Appointment AddAppointment(AppointmentStatus status)
        {
            var appointment = new Appointment
            {
                Id = 100,
                FacilityId = FacilityId,
                Date = new DateOnly(2030, 1, 15),
                Time = new TimeOnly(10, 0),
                Duration = TimeSpan.FromMinutes(30),
                ServiceId = service1.Id,
                Service = service1,
                ClientId = client1.Id,
                Client = client1,
                Status = status,
                Notes = "original"
            };
            appointments.Add(appointment);
            return appointment;
        }

        private AppointmentEditDTO DtoMatching(Appointment a) => new AppointmentEditDTO
        {
            Date = a.Date,
            Time = a.Time,
            Duration = a.Duration,
            Service = new ServiceDTO { Id = a.ServiceId },
            Client = new ClientDTO { Id = a.ClientId },
            Notes = a.Notes
        };

        [Fact]
        public async Task Edit_RevertsConfirmedToUnconfirmed_WhenDateChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);
            dto.Date = appointment.Date.AddDays(1);

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Unconfirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_RevertsConfirmedToUnconfirmed_WhenTimeChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);
            dto.Time = appointment.Time.AddHours(1);

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Unconfirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_RevertsConfirmedToUnconfirmed_WhenServiceChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);
            dto.Service = new ServiceDTO { Id = service2.Id };

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Unconfirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_RevertsConfirmedToUnconfirmed_WhenClientChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);
            dto.Client = new ClientDTO { Id = client2.Id };

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Unconfirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_KeepsConfirmedStatus_WhenOnlyDurationChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);
            dto.Duration = TimeSpan.FromMinutes(45);

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_KeepsConfirmedStatus_WhenOnlyNotesChange()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);
            dto.Notes = "edited";

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_KeepsConfirmedStatus_WhenNothingChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Confirmed);
            var dto = DtoMatching(appointment);

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Confirmed, appointment.Status);
        }

        [Fact]
        public async Task Edit_KeepsNoShowStatus_WhenDateChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.NoShow);
            var dto = DtoMatching(appointment);
            dto.Date = appointment.Date.AddDays(1);

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.NoShow, appointment.Status);
        }

        [Fact]
        public async Task Edit_KeepsUnconfirmedStatus_WhenDateChanges()
        {
            var appointment = AddAppointment(AppointmentStatus.Unconfirmed);
            var dto = DtoMatching(appointment);
            dto.Date = appointment.Date.AddDays(1);

            await service.Edit(appointment.Id, dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Unconfirmed, appointment.Status);
        }

        [Fact]
        public async Task AddNew_CreatesAppointmentAsUnconfirmed()
        {
            var dto = new AppointmentEditDTO
            {
                Date = new DateOnly(2030, 1, 15),
                Time = new TimeOnly(10, 0),
                Duration = TimeSpan.FromMinutes(30),
                Service = new ServiceDTO { Id = service1.Id },
                Client = new ClientDTO { Id = client1.Id },
                Notes = null
            };

            var result = await service.AddNew(dto, FacilityId, ignoreTimeNotAvailable: false);

            Assert.Equal(AppointmentStatus.Unconfirmed, result.Status);
        }
    }
}
