using Appy.Contracts;
using Appy.Domain;
using Appy.DTOs;
using Appy.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace Appy.Services.Facilities
{
    public class FacilityService : IFacilityService
    {
        private MainDbContext context;

        public FacilityService(MainDbContext context)
        {
            this.context = context;
        }

        public async Task<Facility> AddNew(FacilityDTO dto, int ownerId)
        {
            var facility = new Facility()
            {
                Name = dto.Name,
                OwnerId = ownerId
            };

            context.Facilities.Add(facility);
            await context.SaveChangesAsync();

            return facility;
        }

        public async Task<Facility> Edit(int ownerId, int facilityId, FacilityDTO dto)
        {
            var facility = await context.Facilities.FirstOrDefaultAsync(o => o.OwnerId == ownerId && o.Id == facilityId);
            if (facility == null)
                throw new NotFoundException();

            facility.Name = dto.Name;
            await context.SaveChangesAsync();

            return facility;
        }

        public Task<List<Facility>> GetMy(int ownerId)
        {
            return context.Facilities.Where(o => o.OwnerId == ownerId).ToListAsync();
        }

        public async Task<Facility> GetById(int userId, int facilityId)
        {
            var facility = await context.Facilities.FirstOrDefaultAsync(o => o.OwnerId == userId && o.Id == facilityId);
            if (facility == null)
                throw new NotFoundException();

            return facility;
        }

        public async Task Delete(int userId, int facilityId)
        {
            var facility = await context.Facilities.FirstOrDefaultAsync(o => o.OwnerId == userId && o.Id == facilityId);
            if (facility == null)
                throw new NotFoundException();

            var user = await context.Users.FirstOrDefaultAsync(o => o.Id == userId);
            if (user == null)
                throw new NotFoundException();

            if (user.SelectedFacilityId == facilityId)
                user.SelectedFacilityId = null;

            context.Facilities.Remove(facility);
            await context.SaveChangesAsync();
        }

        public async Task SetSelectedFacility(int userId, int facilityId)
        {
            var user = await context.Users.FirstOrDefaultAsync(o => o.Id == userId);
            if (user == null)
                throw new NotFoundException();

            var facility = await context.Facilities.FirstOrDefaultAsync(o => o.OwnerId == userId && o.Id == facilityId);
            if (facility == null)
                throw new NotFoundException();

            user.SelectedFacilityId = facilityId;
            await context.SaveChangesAsync();
        }

        public async Task<int?> GetSelectedFacility(int userId)
        {
            var user = await context.Users.FirstOrDefaultAsync(o => o.Id == userId);
            if (user == null)
                throw new NotFoundException();

            return user.SelectedFacilityId;
        }
    }
}
