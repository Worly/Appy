using Appy.Domain;
using Appy.DTOs;

namespace Appy.Contracts
{
    public interface IServiceService
    {
        Task<List<Service>> GetAll(int facilityId, bool archived);
        Task<Service> GetById(int id, int facilityId);
        Task<Service> AddNew(ServiceDTO dto, int facilityId);
        Task<Service> Edit(int id, ServiceDTO dto, int facilityId);
        Task Delete(int id, int facilityId);
        Task<Service> SetArchive(int id, int facilityId, bool isArchived);
    }
}
