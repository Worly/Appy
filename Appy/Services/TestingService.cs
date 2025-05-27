using Appy.Domain;
using Appy.Exceptions;
using Appy.Services.Facilities;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
{
    public interface ITestingService
    {
        public Task Seed();
    }

    public class TestingService : ITestingService
    {
        private MainDbContext context;
        private IUserService userService;
        private IFacilityService facilityService;
        private IWebHostEnvironment environment;

        public TestingService(MainDbContext context, IUserService userService, IFacilityService facilityService, IWebHostEnvironment environment)
        {
            this.context = context;
            this.userService = userService;
            this.facilityService = facilityService;
            this.environment = environment;
        }

        public async Task Seed()
        {
            if (environment.IsProduction() && Environment.GetEnvironmentVariable("ENABLE_TEST_SEEDING") != "true")
            {
                throw new HttpException(System.Net.HttpStatusCode.Forbidden, "Test seeding is not allowed in production environment.");
            }

            await SeedAppointments();
        }

        private async Task SeedAppointments()
        {
            Console.WriteLine("Seeding!");

            var user = await GetCleanUser("appointments");

            var facility = new Facility()
            {
                OwnerId = user.Id,
                Name = "Test Facility"
            };
            context.Facilities.Add(facility);

            SeedWorkingHours(facility);

            var service0 = new Service()
            {
                Facility = facility,
                Name = "Service0",
                DisplayName = "Service0",
                Duration = TimeSpan.FromMinutes(15),
                ColorId = 5,
                IsArchived = false,
            };

            var service1 = new Service()
            {
                Facility = facility,
                Name = "Service1",
                DisplayName = "Service1",
                Duration = TimeSpan.FromMinutes(30),
                ColorId = 6,
                IsArchived = false,
            };

            var service2 = new Service()
            {
                Facility = facility,
                Name = "Service2",
                DisplayName = "Service2",
                Duration = TimeSpan.FromMinutes(60),
                ColorId = 8,
                IsArchived = false,
            };

            context.Services.Add(service0);
            context.Services.Add(service1);
            context.Services.Add(service2);

            var client0 = new Client()
            {
                Facility = facility,
                Name = "Client0",
                Surname = "Client0",
            };

            var client1 = new Client()
            {
                Facility = facility,
                Name = "Client1",
                Surname = "Client1",
            };

            var client2 = new Client()
            {
                Facility = facility,
                Name = "Client2",
                Surname = "Client2",
            };

            context.Clients.Add(client1);
            context.Clients.Add(client2);

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 7),
                Time = new TimeOnly(8, 0),
                Duration = TimeSpan.FromMinutes(30),
            });

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 7),
                Time = new TimeOnly(9, 0),
                Duration = TimeSpan.FromMinutes(60),
            });

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 8),
                Time = new TimeOnly(8, 35),
                Duration = TimeSpan.FromMinutes(60),
            });

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 8),
                Time = new TimeOnly(9, 0),
                Duration = TimeSpan.FromMinutes(30),
            });

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 9),
                Time = new TimeOnly(8, 0),
                Duration = TimeSpan.FromMinutes(40),
            });

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 9),
                Time = new TimeOnly(9, 0),
                Duration = TimeSpan.FromMinutes(60),
            });

            context.Appointments.Add(new Appointment()
            {
                Facility = facility,
                Client = client0,
                Service = service0,
                Date = new DateOnly(2021, 2, 9),
                Time = new TimeOnly(9, 50),
                Duration = TimeSpan.FromMinutes(45),
            });

            await context.SaveChangesAsync();

            user.SelectedFacilityId = facility.Id;

            await context.SaveChangesAsync();
        }

        private void SeedWorkingHours(Facility facility)
        {
            foreach(var day in Enum.GetValues(typeof(DayOfWeek)).Cast<DayOfWeek>())
            {
                context.WorkingHours.Add(new WorkingHour()
                {
                    Facility = facility,
                    DayOfWeek = day,
                    TimeFrom = new TimeOnly(8, 0),
                    TimeTo = new TimeOnly(16, 0)
                });
            }
        }

        private async Task<User> GetCleanUser(string username)
        {
            var user = await context.Users.SingleOrDefaultAsync(u => u.Email == $"{username}@e2e.com");
            if (user == null)
            {
                await this.userService.Register(new DTOs.RegisterDTO()
                {
                    Email = $"{username}@e2e.com",
                    Password = username,
                    Name = username,
                    Surname = username,
                }, "");

                return await context.Users.SingleAsync(u => u.Email == $"{username}@e2e.com");
            }
            else
            {
                await ClearAllForUser(user.Id);

                return user;
            }
        }

        private async Task ClearAllForUser(int userId)
        {
            var facilities = await facilityService.GetMy(userId);

            foreach (var facility in facilities)
            {
                await ClearAllForFacility(facility.Id);
            }

            context.Facilities.RemoveRange(context.Facilities.Where(f => f.OwnerId == userId));

            await context.SaveChangesAsync();
        }

        private async Task ClearAllForFacility(int facilityId)
        {
            context.Appointments.RemoveRange(context.Appointments.Where(a => a.FacilityId == facilityId));
            context.Services.RemoveRange(context.Services.Where(s => s.FacilityId == facilityId));
            context.Clients.RemoveRange(context.Clients.Where(c => c.FacilityId == facilityId));
            context.WorkingHours.RemoveRange(context.WorkingHours.Where(w => w.FacilityId == facilityId));
            context.DashboardSettings.RemoveRange(context.DashboardSettings.Where(d => d.FacilityId == facilityId));

            await context.SaveChangesAsync();
        }
    }
}
