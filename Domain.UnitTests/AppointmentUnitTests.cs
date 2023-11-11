using Appy.Contracts;
using Appy.Domain;
using Appy.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Domain.UnitTests
{
    [TestFixture]
    public class AppointmentUnitTests : BaseUnitTest
    {
        [Test]
        public async Task GetAll_ReturnsAppointmentsForFacilityAndDate()
        {
            // Arrange
            var facilityId = 1;
            var date = new DateOnly(2023, 5, 16);

            // Act
            var result = await _appointmentService.GetAll(date, facilityId);

            // Assert
            Assert.IsNotNull(result);
            Assert.IsInstanceOf<List<Appointment>>(result);
            Assert.That(result.Count, Is.EqualTo(5));
            Assert.AreEqual(1, result[0].Id);
            Assert.AreEqual(date, result[2].Date);
            Assert.AreEqual(facilityId, result[0].FacilityId);
        }
    }
}