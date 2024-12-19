namespace Appy.Services.MessagingServices
{
    public interface IMessagingService
    {
        Task<string?> GetAppSpecificUserID(string apiToken, string contact);
        Task<bool> SendMessage(string apiToken, string appSpecificUserID, string message);
    }
}
