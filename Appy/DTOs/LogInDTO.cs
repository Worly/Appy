namespace Appy.DTOs
{
    public class LogInDTO
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    public class LogInResponseDTO
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
    }
}
