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
        List<Service> GetAll(int facilityId);
        Service GetById(int id, int facilityId);
        Service AddNew(ServiceDTO dto, int facilityId);
        Service Edit(int id, ServiceDTO dto, int facilityId);
        void Delete(int id, int facilityId);
    }

    public class ServiceService : IServiceService
    {
        private MainDbContext context;

        public ServiceService(MainDbContext context)
        {
            this.context = context;
        }

        public List<Service> GetAll(int facilityId)
        {
            return context.Services.Where(s => s.FacilityId == facilityId).ToList();
        }

        public Service GetById(int id, int facilityId)
        {
            var service = context.Services.FirstOrDefault(s => s.Id == id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException();

            return service;
        }

        public Service AddNew(ServiceDTO dto, int facilityId)
        {
            var nameTaken = context.Services.Where(o => o.FacilityId == facilityId && o.Name == dto.Name).Any();
            if (nameTaken)
                throw new ValidationException(nameof(Service.Name), "pages.service.errors.NAME_TAKEN");

            var service = new Service()
            {
                FacilityId = facilityId,
                Name = dto.Name,
                Duration = dto.Duration,
                ColorId = dto.ColorId
            };

            context.Services.Add(service);
            context.SaveChanges();

            return service;
        }

        public Service Edit(int id, ServiceDTO dto, int facilityId)
        {
            var service = context.Services.FirstOrDefault(s => s.Id == id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException();

            var nameTaken = context.Services.Where(s => s.Id != id && s.Name == dto.Name && s.FacilityId == facilityId).Any();
            if (nameTaken)
                throw new ValidationException(nameof(Service.Name), "pages.service.errors.NAME_TAKEN");

            service.Name = dto.Name;
            service.Duration = dto.Duration;
            service.ColorId = dto.ColorId;
            context.SaveChanges();

            return service;
        }

        public void Delete(int id, int facilityId)
        {
            var service = context.Services.FirstOrDefault(s => s.Id == id && s.FacilityId == facilityId);
            if (service == null)
                throw new NotFoundException();

            context.Services.Remove(service);
            context.SaveChanges();
        }
    }
}
