using Appy.Domain;
using Appy.DTOs;

namespace Appy.Contracts
{
    public interface IWorkingHourService
    {
        Task<IEnumerable<WorkingHourDTO>> GetAll(int facilityId);
        Task<IEnumerable<WorkingHourDTO>> GetWorkingHours(DateOnly date, int facilityId);
        Task SetWorkingHours(IEnumerable<WorkingHourDTO> workingHours, int facilityId);
    }
}
