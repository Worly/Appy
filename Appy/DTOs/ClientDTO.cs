namespace Appy.DTOs
{
    public class ClientDTO
    {
        public int Id { get; set; }

        public string Name { get; set; }
        public string? Surname { get; set; }
        public List<ClientContactDTO> Contacts { get; set; }
        public string? Notes { get; set; }

        public bool IsArchived { get; set; }
    }
}
