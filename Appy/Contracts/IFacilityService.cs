using Appy.Domain;
using Appy.DTOs;

namespace Appy.Contracts
{
    public interface IFacilityService
    {
        Task<Facility> AddNew(FacilityDTO dto, int ownerId);
        Task<Facility> Edit(int ownerId, int facilityId, FacilityDTO dto);
        Task<List<Facility>> GetMy(int ownerId);
        Task<Facility> GetById(int userId, int facilityId);
        Task Delete(int userId, int facilityId);

        Task SetSelectedFacility(int userId, int facilityId);
        Task<int?> GetSelectedFacility(int userId);
    }
}
