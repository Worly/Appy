using Appy.Domain;

namespace Appy.Services.MessagingServices
{
    public interface IMessagingServiceManager
    {
        public IMessagingService GetService(ContactType type);
        string GetAccessToken(ContactType type, ClientNotificationsSettings settings);
    }

    public class MessagingServiceManager : IMessagingServiceManager
    {
        private Dictionary<ContactType, IMessagingService> services;

        public MessagingServiceManager(InstagramMessagingService instagramService)
        {
            services = new Dictionary<ContactType, IMessagingService>
            {
                { ContactType.Instagram, instagramService }
            };
        }

        public IMessagingService GetService(ContactType type)
        {
            if (services.ContainsKey(type))
                return services[type];
            else
                throw new NotImplementedException();
        }

        public string GetAccessToken(ContactType type, ClientNotificationsSettings settings)
        {
            switch (type)
            {
                case ContactType.Instagram:
                    return settings.InstagramAPIAccessToken;
                default:
                    throw new NotImplementedException();
            }
        }
    }
}
