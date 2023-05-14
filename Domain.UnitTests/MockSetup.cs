using Appy.Domain;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace Domain.UnitTests
{
    public class MockSetup
    {
        public static MainDbContext GetMockContext()
        {
            var options = new DbContextOptionsBuilder<MainDbContext>()
                  .UseInMemoryDatabase(Guid.NewGuid().ToString())
                  .Options;
            var mockContext = new Mock<MainDbContext>(options);

            mockContext.Setup(c => c.Appointments).Returns(SetupAppointment().Object);
            mockContext.Setup(c => c.Clients).Returns(SetupClient().Object);
            mockContext.Setup(c => c.Services).Returns(SetupService().Object);
           
            return mockContext.Object;
        }

        private static Mock<DbSet<Appointment>> SetupAppointment()
        {
            var lst = new List<Appointment>
            {
                new Appointment { Id = 1, FacilityId = 1, Date = new DateOnly(2023, 5, 15), ServiceId = 1, ClientId = 1 },
                new Appointment { Id = 2, FacilityId = 1, Date = new DateOnly(2023, 5, 15), ServiceId = 2, ClientId = 2 },
                new Appointment { Id = 3, FacilityId = 1, Date = new DateOnly(2023, 5, 16), ServiceId = 1, ClientId = 3 },
                new Appointment { Id = 4, FacilityId = 1, Date = new DateOnly(2023, 5, 17), ServiceId = 3, ClientId = 4 },
                new Appointment { Id = 5, FacilityId = 1, Date = new DateOnly(2023, 5, 17), ServiceId = 2, ClientId = 1 },
            };

            var queryable = lst.AsQueryable();

            var MockSet = new Mock<DbSet<Appointment>>();

            MockSet.As<IQueryable<Appointment>>().Setup(m => m.Expression).Returns(queryable.Expression);
            MockSet.As<IQueryable<Appointment>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
            MockSet.As<IQueryable<Appointment>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator);

            MockSet.Setup(m => m.Add(It.IsAny<Appointment>())).Callback((Delegate)((Appointment itm) => lst.Add(itm)));
            MockSet.Setup(m => m.Remove(It.IsAny<Appointment>())).Callback((Appointment itm) => lst.Remove(itm));

            MockSet.As<IAsyncEnumerable<Appointment>>()
                .Setup(m => m.GetAsyncEnumerator(It.IsAny<CancellationToken>()))
                .Returns(new TestAsyncEnumerator<Appointment>(queryable.AsEnumerable().GetEnumerator()));

            MockSet.As<IQueryable<Appointment>>()
                .Setup(m => m.Provider)
                .Returns(new TestAsyncQueryProvider<Appointment>(queryable.Provider));
            return MockSet;
        }

        private static Mock<DbSet<Client>> SetupClient()
        {
            var lst = new List<Client>
            {
                new Client { Id = 1, FacilityId = 1, Nickname = "John", IsArchived = false },
                new Client { Id = 2, FacilityId = 1, Nickname = "Jane", IsArchived = false },
                new Client { Id = 3, FacilityId = 1, Nickname = "Bob", IsArchived = false },
                new Client { Id = 4, FacilityId = 1, Nickname = "Alice", IsArchived = false },
                new Client { Id = 5, FacilityId = 1, Nickname = "Joe", IsArchived = true },
            };

            var queryable = lst.AsQueryable();
            //var mockQueryable = queryable.OrderBy(c => c.Name);

            var MockSet = new Mock<DbSet<Client>>();

            MockSet.As<IQueryable<Client>>().Setup(m => m.Expression).Returns(queryable.Expression);
            MockSet.As<IQueryable<Client>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
            MockSet.As<IQueryable<Client>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator);

            MockSet.Setup(m => m.Add(It.IsAny<Client>())).Callback((Delegate)((Client itm) => lst.Add(itm)));
            MockSet.Setup(m => m.Remove(It.IsAny<Client>())).Callback((Client itm) => lst.Remove(itm));

            MockSet.As<IAsyncEnumerable<Client>>()
                .Setup(m => m.GetAsyncEnumerator(It.IsAny<CancellationToken>()))
                .Returns(new TestAsyncEnumerator<Client>(queryable.AsEnumerable().GetEnumerator()));

            MockSet.As<IQueryable<Client>>()
                .Setup(m => m.Provider)
                .Returns(new TestAsyncQueryProvider<Client>(queryable.Provider));
            return MockSet;
        }

        private static Mock<DbSet<Service>> SetupService()
        {
            var lst = new List<Service>
            {
                new Service { Id = 1, FacilityId = 1, Name = "Haircut", ColorId = 1 },
                new Service { Id = 2, FacilityId = 1, Name = "Beard trimming", ColorId = 2 },
                new Service { Id = 3, FacilityId = 1, Name = "Massage", ColorId = 3 },
                new Service { Id = 4, FacilityId = 1, Name = "Facial", ColorId = 4 , },
            };

            var queryable = lst.AsQueryable();

            var MockSet = new Mock<DbSet<Service>>();

            MockSet.As<IQueryable<Service>>().Setup(m => m.Expression).Returns(queryable.Expression);
            MockSet.As<IQueryable<Service>>().Setup(m => m.ElementType).Returns(queryable.ElementType);
            MockSet.As<IQueryable<Service>>().Setup(m => m.GetEnumerator()).Returns(queryable.GetEnumerator);

            MockSet.Setup(m => m.Add(It.IsAny<Service>())).Callback((Delegate)((Service itm) => lst.Add(itm)));
            MockSet.Setup(m => m.Remove(It.IsAny<Service>())).Callback((Service itm) => lst.Remove(itm));

            MockSet.As<IAsyncEnumerable<Service>>()
                .Setup(m => m.GetAsyncEnumerator(It.IsAny<CancellationToken>()))
                .Returns(new TestAsyncEnumerator<Service>(queryable.AsEnumerable().GetEnumerator()));

            MockSet.As<IQueryable<Service>>()
                .Setup(m => m.Provider)
                .Returns(new TestAsyncQueryProvider<Service>(queryable.Provider));
            return MockSet;
        }

    }
}
