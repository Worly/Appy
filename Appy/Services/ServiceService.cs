using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using EntityFramework.Exceptions.Common;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Appy.Services
{
    public interface IServiceService
    {
        Task<List<Service>> GetAll(int facilityId);
        Task<Service> GetById(int id, int facilityId);
        Task<Service> AddNew(ServiceDTO dto, int facilityId);
        Task<Service> Edit(int id, ServiceDTO dto, int facilityId);
        Task Delete(int id, int facilityId);
    }

    public class ServiceService : IServiceService
    {
        private MainDbContext context;

        public ServiceService(MainDbContext context)
        {
            this.context = context;
        }

        public Task<List<Service>> GetAll(int facilityId)
        {
            return context.Services.Where(s => s.FacilityId == facilityId).OrderBy(o => o.Name).ToListAsync();
        }

        public async Task<Service> GetById(int id, int facilityId)
        {
            var service = await context.Services.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException();

            return service;
        }

        public async Task<Service> AddNew(ServiceDTO dto, int facilityId)
        {
            var nameTaken = await context.Services.Where(o => o.FacilityId == facilityId && o.Name == dto.Name).AnyAsync();
            if (nameTaken)
                throw new ValidationException(nameof(Service.Name), "pages.services.errors.NAME_TAKEN");

            var service = new Service()
            {
                FacilityId = facilityId,
                Name = dto.Name,
                Duration = dto.Duration,
                ColorId = dto.ColorId
            };

            context.Services.Add(service);
            await context.SaveChangesAsync();

            return service;
        }

        public async Task<Service> Edit(int id, ServiceDTO dto, int facilityId)
        {
            var service = await context.Services.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException();

            var nameTaken = await context.Services.Where(s => s.Id != id && s.Name == dto.Name && s.FacilityId == facilityId).AnyAsync();
            if (nameTaken)
                throw new ValidationException(nameof(Service.Name), "pages.services.errors.NAME_TAKEN");

            service.Name = dto.Name;
            service.Duration = dto.Duration;
            service.ColorId = dto.ColorId;
            await context.SaveChangesAsync();

            return service;
        }

        public async Task Delete(int id, int facilityId)
        {
            var service = await context.Services.FirstOrDefaultAsync(s => s.Id == id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException();

            context.Services.Remove(service);
            await context.SaveChangesAsync();
        }
    }
}
