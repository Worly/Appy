using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using EntityFramework.Exceptions.Common;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services
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

    public class ClientService : IClientService
    {
        private MainDbContext context;

        public ClientService(MainDbContext context)
        {
            this.context = context;
        }

        public Task<List<Client>> GetAll(int facilityId, bool archived)
        {
            return context.Clients
                .Where(s => s.FacilityId == facilityId && s.IsArchived == archived)
                .OrderBy(o => o.Name)
                .ThenBy(o => o.Surname)
                .ToListAsync();
        }

        public async Task<Client> GetById(int id, int facilityId)
        {
            var client = await context.Clients.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (client == null)
                throw new NotFoundException();

            return client;
        }

        public async Task<Client> AddNew(ClientDTO dto, int facilityId)
        {
            var nameSurnameTaken = await context.Clients.Where(o => o.FacilityId == facilityId && o.Name == dto.Name && o.Surname == dto.Surname).AnyAsync();
            if (nameSurnameTaken)
                throw new ValidationException(nameof(Client.Surname), "pages.clients.errors.NAME_AND_SURNAME_TAKEN");

            var client = new Client()
            {
                FacilityId = facilityId,
                Name = dto.Name,
                Surname = dto.Surname,
                PhoneNumber = dto.PhoneNumber,
                Email = dto.Email,
                Notes = dto.Notes,
                IsArchived = dto.IsArchived
            };

            context.Clients.Add(client);
            await context.SaveChangesAsync();

            return client;
        }

        public async Task<Client> Edit(int id, ClientDTO dto, int facilityId)
        {
            var client = await context.Clients.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (client == null)
                throw new NotFoundException();

            var nameSurnameTaken = await context.Clients.Where(s => s.Id != id && s.Name == dto.Name && s.Surname == dto.Surname && s.FacilityId == facilityId).AnyAsync();
            if (nameSurnameTaken)
                throw new ValidationException(nameof(Client.Surname), "pages.clients.errors.NAME_AND_SURNAME_TAKEN");

            client.Name = dto.Name;
            client.Surname = dto.Surname;
            client.PhoneNumber = dto.PhoneNumber;
            client.Email = dto.Email;
            client.Notes = dto.Notes;
            client.IsArchived = dto.IsArchived;
            await context.SaveChangesAsync();

            return client;
        }

        public async Task Delete(int id, int facilityId)
        {
            var client = await context.Clients.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (client == null)
                throw new NotFoundException();

            try
            {
                context.Clients.Remove(client);
                await context.SaveChangesAsync();
            }
            catch (ReferenceConstraintException)
            {
                throw new BadRequestException("Archive");
            }
        }

        public async Task<Client> SetArchive(int id, int facilityId, bool isArchived)
        {
            var client = await context.Clients.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (client == null)
                throw new NotFoundException();

            client.IsArchived = isArchived;

            await context.SaveChangesAsync();

            return client;
        }
    }
}
