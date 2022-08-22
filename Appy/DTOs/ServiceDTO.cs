namespace Appy.DTOs
{
    public class ServiceDTO
    {
        public int Id { get; set; }

        public string Name { get; set; }
        public string DisplayName { get; set; }
        public TimeSpan Duration { get; set; }
        public int ColorId { get; set; }
        public bool IsArchived { get; set; }
    }
}
