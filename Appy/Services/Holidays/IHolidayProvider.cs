namespace Appy.Services.Holidays
{
    public record ProviderHoliday(DateOnly Date, string LocalName, string CountryCode);

    public record ProviderCountry(string CountryCode, string Name);

    public interface IHolidayProvider
    {
        Task<List<ProviderHoliday>> GetPublicHolidays(int year, string countryCode);
        Task<List<ProviderCountry>> GetAvailableCountries();
    }

    // Thrown when the provider is unreachable / returns a non-success response. SaveSettings lets it
    // propagate (so nothing is persisted); the daily job catches it per-facility and continues.
    public class HolidayProviderException : Exception
    {
        public HolidayProviderException(string message) : base(message) { }
    }
}
