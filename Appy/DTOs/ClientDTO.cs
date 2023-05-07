﻿namespace Appy.DTOs
{
    public class ClientDTO
    {
        public int Id { get; set; }

        public string Nickname { get; set; }
        public string? Name { get; set; }
        public string? Surname { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }

        public bool IsArchived { get; set; }
    }
}