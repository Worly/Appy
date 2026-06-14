namespace Appy.DTOs
{
    public class AppointmentListPageDTO
    {
        public List<AppointmentViewDTO> Appointments { get; set; }
        public List<TimeOffOccurrenceDTO> TimeOffs { get; set; }
    }
}
