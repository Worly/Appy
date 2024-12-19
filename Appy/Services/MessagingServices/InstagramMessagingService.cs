using System.Text.Json;

namespace Appy.Services.MessagingServices
{
    public class InstagramMessagingService : IMessagingService
    {
        private static HttpClient httpClient = new HttpClient()
        {
            BaseAddress = new Uri("https://graph.instagram.com/v21.0"),
        };

        private readonly ILogger<InstagramMessagingService> logger;

        public InstagramMessagingService(ILogger<InstagramMessagingService> logger)
        {
            this.logger = logger;
        }

        public async Task<bool> SendMessage(string apiToken, string appSpecificUserID, string message)
        {
            var response = await HttpPost<MessagesResponse>($"me/messages?access_token={apiToken}", new Dictionary<string, object>()
            {
                { "recipient", new { id = appSpecificUserID } },
                { "message", new { text = message } }
            });

            if (response == null)
                return false;

            return true;
        }

        public async Task<string?> GetAppSpecificUserID(string apiToken, string contact)
        {
            string? after = null;
            string? userID;

            do
            {
                logger.LogInformation("Trying to get app specific user ID for contact '{0}' with after '{1}'", contact, after);

                (userID, after) = await GetAppSpecificUserIDInternal(apiToken, contact, after);

            } while (string.IsNullOrEmpty(userID) && after != null);

            return userID;
        }

        private async Task<(string? userID, string? cursorAfter)> GetAppSpecificUserIDInternal(string apiToken, string contact, string? after)
        {
            var url = $"me/conversations?access_token={apiToken}&fields=participants&limit=50";

            if (after != null)
                url += $"&after={after}";

            var response = await HttpGet<ConversationsResponse>(url);
            if (response == null)
                return (null, null);

            var nextAfter = response.Value.Paging.Cursors.After;

            foreach (var conversation in response.Value.Data)
            {
                foreach (var participant in conversation.Participants.Data)
                {
                    if (participant.Username == contact)
                        return (participant.Id, nextAfter);
                }
            }

            return (null, nextAfter);
        }

        private async Task<T?> HttpGet<T>(string url) where T : struct
        {
            try
            {
                using var httpResponse = await httpClient.GetAsync(url);

                if (!httpResponse.IsSuccessStatusCode)
                {
                    logger.LogError("Failed to GET '{0}' from Instagram API. Status code: {1}. Response: {2}",
                        httpResponse.RequestMessage?.RequestUri, httpResponse.StatusCode, await httpResponse.Content.ReadAsStringAsync());

                    return null;
                }

                var response = await httpResponse.Content.ReadFromJsonAsync<T>();

                return response;
            }
            catch (Exception e)
            {
                logger.LogError("Exception while trying to HTTP GET from Instagram API on {0}, message: {1}", url, e.Message);

                return null;
            }
        }

        private async Task<T?> HttpPost<T>(string url, Dictionary<string, object> formData) where T : struct
        {
            try
            {
                var body = new MultipartFormDataContent();
                foreach (var data in formData)
                {
                    body.Add(new StringContent(JsonSerializer.Serialize(data.Value)), data.Key);
                }

                using var httpResponse = await httpClient.PostAsync(url, body);

                if (!httpResponse.IsSuccessStatusCode)
                {
                    logger.LogError("Failed to POST '{0}' to Instagram API. Status code: {1}. Response: {2}", httpResponse.RequestMessage?.RequestUri, httpResponse.StatusCode, await httpResponse.Content.ReadAsStringAsync());

                    return null;
                }

                var response = await httpResponse.Content.ReadFromJsonAsync<T>();

                return response;
            }
            catch (Exception e)
            {
                logger.LogError("Exception while trying to HTTP POST to Instagram API on {0}, message: {1}", url, e.Message);

                return null;
            }
        }

        private struct ConversationsResponse
        {
            public List<ConversationData> Data { get; set; }
            public Paging Paging { get; set; }
        }

        private struct ConversationData
        {
            public string Id { get; set; }

            public Participants Participants { get; set; }
        }

        private struct Participants
        {
            public List<Participant> Data { get; set; }
        }

        private struct Participant
        {
            public string Username { get; set; }
            public string Id { get; set; }
        }

        private struct Paging
        {
            public string Next { get; set; }
            public Cursors Cursors { get; set; }
        }

        private struct Cursors
        {
            public string After { get; set; }
        }

        private struct MessagesResponse
        {
            public string RecipientID { get; set; }
            public string MessageID { get; set; }
        }
    }
}
