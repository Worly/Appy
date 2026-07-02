using System.Text.Json;
using System.Text.Json.Serialization;

namespace Appy.Services.Holidays
{
    public class NagerDateHolidayProvider : IHolidayProvider
    {
        private readonly HttpClient httpClient;
        private readonly ILogger<NagerDateHolidayProvider> logger;

        private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

        public NagerDateHolidayProvider(HttpClient httpClient, ILogger<NagerDateHolidayProvider> logger)
        {
            this.httpClient = httpClient;
            this.logger = logger;
        }

        public async Task<List<ProviderHoliday>> GetPublicHolidays(int year, string countryCode)
        {
            var dtos = await Get<List<NagerHolidayDTO>>($"/api/v3/PublicHolidays/{year}/{countryCode}");
            return dtos
                .Where(d => d.Date != null && d.LocalName != null)
                .Select(d => new ProviderHoliday(DateOnly.Parse(d.Date!), d.LocalName!, d.CountryCode ?? countryCode))
                .ToList();
        }

        public async Task<List<ProviderCountry>> GetAvailableCountries()
        {
            var dtos = await Get<List<NagerCountryDTO>>("/api/v3/AvailableCountries");
            return dtos
                .Where(d => d.CountryCode != null && d.Name != null)
                .Select(d => new ProviderCountry(d.CountryCode!, d.Name!))
                .ToList();
        }

        // Throws HolidayProviderException on a non-success response or missing body, so callers can decide
        // whether to abort (SaveSettings persists nothing) or skip-and-continue (the daily job).
        private async Task<T> Get<T>(string url)
        {
            using var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Nager.Date GET '{Url}' failed: {StatusCode}", url, response.StatusCode);
                throw new HolidayProviderException($"Nager.Date GET '{url}' failed with {response.StatusCode}");
            }
            var stream = await response.Content.ReadAsStreamAsync();
            return await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions)
                ?? throw new HolidayProviderException($"Nager.Date GET '{url}' returned no data");
        }

        private class NagerHolidayDTO
        {
            [JsonPropertyName("date")] public string? Date { get; set; }
            [JsonPropertyName("localName")] public string? LocalName { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("countryCode")] public string? CountryCode { get; set; }
        }

        private class NagerCountryDTO
        {
            [JsonPropertyName("countryCode")] public string? CountryCode { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
        }
    }
}
