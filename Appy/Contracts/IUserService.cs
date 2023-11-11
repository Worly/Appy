using Appy.Domain;
using Appy.DTOs;

namespace Appy.Contracts
{
    public interface IUserService
    {
        Task<LogInResponseDTO> Authenticate(LogInDTO model);
        Task<LogInResponseDTO> Register(RegisterDTO model);
        Task<LogInResponseDTO> RefreshTokens(string refreshToken);
        Task<User> GetById(int id);
    }
}
