using Appy.Contracts;
using Appy.Domain;
using Appy.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.UnitTests
{
    public class BaseUnitTest
    {
        protected MainDbContext _context;
        protected AppointmentService _appointmentService;
        protected readonly IWorkingHourService _workingHourService;
        protected ClientService _clientService;


        [SetUp]
        public void Setup()
        {
            _context = MockSetup.GetMockContext();
            _appointmentService = new AppointmentService(_context, _workingHourService);
            _clientService = new ClientService(_context);
        }
    }
}
