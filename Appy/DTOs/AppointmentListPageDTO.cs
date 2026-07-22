namespace Appy.DTOs
{
    public class AppointmentListPageDTO
    {
        public List<AppointmentViewDTO> Appointments { get; set; }
        public List<TimeOffOccurrenceDTO> TimeOffs { get; set; }

        // Cursor to fetch the next page forwards (Date >= NextCursor); null when no content is ahead.
        public DateOnly? NextCursor { get; set; }
        // Cursor to fetch the next page backwards (Date < PrevCursor); null when no content is behind.
        public DateOnly? PrevCursor { get; set; }
    }
}
