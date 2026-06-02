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

        private Appointment Seed(int id, DateOnly date, TimeOnly time, Client client)
        {
            var appointment = new Appointment
            {
                Id = id,
                FacilityId = FacilityId,
                Date = date,
                Time = time,
                Duration = TimeSpan.FromMinutes(30),
                ServiceId = service1.Id,
                Service = service1,
                ClientId = client.Id,
                Client = client,
                Status = AppointmentStatus.Unconfirmed,
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
            dto.Duration = dto.Duration.Add(TimeSpan.FromMinutes(45));

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

        [Fact]
        public async Task GetAll_FindPrevious_AttachesMostRecentEarlierAppointment()
        {
            Seed(1, new DateOnly(2030, 1, 10), new TimeOnly(10, 0), client1);
            Seed(2, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client1);

            var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

            var view = Assert.Single(result);
            Assert.Equal(2, view.Id);
            Assert.NotNull(view.PreviousAppointment);
            Assert.Equal(1, view.PreviousAppointment!.Id);
        }

        [Fact]
        public async Task GetAll_FindPrevious_ResolvesSameDayEarlierTime()
        {
            Seed(1, new DateOnly(2030, 1, 15), new TimeOnly(9, 0), client1);
            Seed(2, new DateOnly(2030, 1, 15), new TimeOnly(11, 0), client1);

            var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

            var firstView = result.Single(a => a.Id == 1);
            var secondView = result.Single(a => a.Id == 2);
            Assert.Null(firstView.PreviousAppointment);
            Assert.NotNull(secondView.PreviousAppointment);
            Assert.Equal(1, secondView.PreviousAppointment!.Id);
        }

        [Fact]
        public async Task GetAll_FindPrevious_IsolatesByClient()
        {
            Seed(1, new DateOnly(2030, 1, 10), new TimeOnly(10, 0), client1);
            Seed(2, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client2);
            Seed(3, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client1);

            var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

            var client1View = result.Single(a => a.Id == 3);
            var client2View = result.Single(a => a.Id == 2);
            Assert.Equal(1, client1View.PreviousAppointment!.Id);
            Assert.Null(client2View.PreviousAppointment);
        }

        [Fact]
        public async Task GetAll_FindPrevious_NullWhenNoEarlierAppointment()
        {
            Seed(1, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client1);

            var result = await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

            Assert.Null(Assert.Single(result).PreviousAppointment);
        }

        [Fact]
        public async Task GetAll_FindPrevious_DoesNotQueryPerRow()
        {
            for (int i = 0; i < 10; i++)
            {
                var client = new Client { Id = 100 + i, FacilityId = FacilityId, Name = $"C{i}", Contacts = new() };
                Seed(200 + i, new DateOnly(2030, 1, 15), new TimeOnly(10, 0), client);
            }

            await service.GetAll(new DateOnly(2030, 1, 15), FacilityId, findPrevious: true, filter: null);

            // One query for the page + one batched query for previous appointments.
            // The old correlated-subquery implementation read the DbSet once per row (N+1).
            dbContextMock.VerifyGet(x => x.Appointments, Times.AtMost(2));
        }
    }
}
