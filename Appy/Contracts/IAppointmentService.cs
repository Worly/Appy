using Appy.Domain;
using Appy.DTOs;

namespace Appy.Contracts
{
    public interface IAppointmentService
    {
        Task<List<Appointment>> GetAll(DateOnly date, int facilityId);
        Task<List<Appointment>> GetList(DateOnly date, Direction direction, int skip, int take, int facilityId);
        Task<Appointment> GetById(int id, int facilityId);
        Task<Appointment> AddNew(AppointmentDTO dto, int facilityId, bool ignoreTimeNotAvailable);
        Task<Appointment> Edit(int id, AppointmentDTO dto, int facilityId, bool ignoreTimeNotAvailable);
        Task Delete(int id, int facilityId);

        List<FreeTimeDTO> GetFreeTimes(List<Appointment> appointmentsOfTheDay, IEnumerable<WorkingHourDTO> workingHours, Service service, TimeSpan duration);
        bool IsAppointmentTimeOk(List<Appointment> appointmentsOfTheDay, IEnumerable<WorkingHourDTO> workingHours, Appointment appointment);
    }
}
