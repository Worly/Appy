using Appy.Domain;
using Appy.DTOs;

namespace Appy.Services.Facilities
{
    public interface IFacilityService
    {
        public Facility AddNew(FacilityDTO dto, int ownerId);
        public Facility Edit(int ownerId, int facilityId, FacilityDTO dto);
        public List<Facility> GetMy(int ownerId);
        public Facility GetById(int userId, int facilityId);
        public bool TryDelete(int userId, int facilityId);

        public void SetSelectedFacility(int userId, int facilityId);
        public int? GetSelectedFacility(int userId);
    }

    public class FacilityService : IFacilityService
    {
        private MainDbContext context;

        public FacilityService(MainDbContext context)
        {
            this.context = context;
        }

        public Facility AddNew(FacilityDTO dto, int ownerId)
        {
            var facility = new Facility()
            {
                Name = dto.Name,
                OwnerId = ownerId
            };

            context.Facilities.Add(facility);
            context.SaveChanges();

            return facility;
        }

        public Facility Edit(int ownerId, int facilityId, FacilityDTO dto)
        {
            var facility = context.Facilities.FirstOrDefault(o => o.OwnerId == ownerId && o.Id == facilityId);
            if (facility == null)
                return null;

            facility.Name = dto.Name;
            context.SaveChanges();

            return facility;
        }

        public List<Facility> GetMy(int ownerId)
        {
            return context.Facilities.Where(o => o.OwnerId == ownerId).ToList();
        }

        public Facility GetById(int userId, int facilityId)
        {
            return context.Facilities.FirstOrDefault(o => o.OwnerId == userId && o.Id == facilityId);
        }

        public bool TryDelete(int userId, int facilityId)
        {
            var facility = context.Facilities.FirstOrDefault(o => o.OwnerId == userId && o.Id == facilityId);
            if (facility == null)
                return false;

            var user = context.Users.FirstOrDefault(o => o.Id == userId);
            if (user.SelectedFacilityId == facilityId)
                user.SelectedFacilityId = null;

            context.Facilities.Remove(facility);
            context.SaveChanges();
            return true;
        }

        public void SetSelectedFacility(int userId, int facilityId)
        {
            var user = context.Users.FirstOrDefault(o => o.Id == userId);
            user.SelectedFacilityId = facilityId;
            context.SaveChanges();
        }

        public int? GetSelectedFacility(int userId)
        {
            var user = context.Users.FirstOrDefault(o => o.Id == userId);
            return user.SelectedFacilityId;
        }
    }
}
