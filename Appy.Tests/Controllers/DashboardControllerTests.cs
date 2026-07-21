using Appy.Controllers;
using Appy.DTOs;
using Appy.Services;
using Appy.Services.SmartFiltering;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace Appy.Tests.Controllers
{
    public class DashboardControllerTests
    {
        private const int FacilityId = 1;

        private readonly Mock<IDashboardService> dashboardServiceMock = new();
        private readonly Mock<IAppointmentService> appointmentServiceMock = new();
        private readonly DashboardController controller;

        public DashboardControllerTests()
        {
            controller = new DashboardController(dashboardServiceMock.Object, appointmentServiceMock.Object);

            var httpContext = new DefaultHttpContext();
            httpContext.Items["facilityId"] = FacilityId;
            controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        }

        [Fact]
        public async Task UpcomingUnconfirmed_ReturnsBareAppointmentList_NotThePageEnvelope()
        {
            var appointments = new List<AppointmentViewDTO> { new() { Id = 1 }, new() { Id = 2 } };

            appointmentServiceMock
                .Setup(x => x.GetList(It.IsAny<DateOnly>(), It.IsAny<Direction>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<SmartFilter?>(), FacilityId))
                .ReturnsAsync(new AppointmentListPageDTO
                {
                    Appointments = appointments,
                    TimeOffs = new List<TimeOffOccurrenceDTO> { new() }
                });

            var result = await controller.UpcomingUnconfirmed(7);

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            Assert.Same(appointments, ok.Value);
        }
    }
}
