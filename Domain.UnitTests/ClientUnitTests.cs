using Appy.Domain;
using Appy.Services;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Domain.UnitTests
{
    [TestFixture]
    public class ClientUnitTests : BaseUnitTest
    {
        [Test]
        public async Task GetAll_ReturnsClientsForFacilityAndArchivedStatus()
        {
            // Arrange
            var facilityId = 1;
            var archived = false;
            
            var result = await _clientService.GetAll(facilityId, archived);

            // Assert
            Assert.IsNotNull(result);
            Assert.IsInstanceOf<List<Client>>(result);
            Assert.AreEqual(2, result.Count);
            Assert.AreEqual(1, result[0].Id);
            Assert.AreEqual(facilityId, result[0].FacilityId);
            Assert.AreEqual(false, result[0].IsArchived);
            Assert.AreEqual(3, result[1].Id);
            Assert.AreEqual(facilityId, result[1].FacilityId);
            Assert.AreEqual(false, result[1].IsArchived);

        }
    }
}
