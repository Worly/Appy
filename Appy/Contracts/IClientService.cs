using Appy.Domain;
using Appy.DTOs;

namespace Appy.Contracts
{
    public interface IClientService
    {
        Task<List<Client>> GetAll(int facilityId, bool archived);
        Task<Client> GetById(int id, int facilityId);
        Task<Client> AddNew(ClientDTO dto, int facilityId);
        Task<Client> Edit(int id, ClientDTO dto, int facilityId);
        Task Delete(int id, int facilityId);
        Task<Client> SetArchive(int id, int facilityId, bool isArchived);
    }
}
