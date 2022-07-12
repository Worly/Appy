namespace Appy.DTOs
{
    public class LogInDTO
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class LogInResponseDTO
    {
        public string Token { get; set; }
    }
}
