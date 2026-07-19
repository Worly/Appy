using System.Net;
using System.Text;
using Appy.Services.Holidays;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;

namespace Appy.Tests.Services
{
    public class NagerDateHolidayProviderTests
    {
        private static NagerDateHolidayProvider MakeProvider(string json, HttpStatusCode status = HttpStatusCode.OK)
        {
            var handler = new StubHandler(json, status);
            var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://date.nager.at") };
            return new NagerDateHolidayProvider(httpClient, NullLogger<NagerDateHolidayProvider>.Instance);
        }

        [Fact]
        public async Task GetPublicHolidays_MapsLocalNameAndDate()
        {
            var json = """
            [
              { "date": "2026-01-01", "localName": "Nova godina", "name": "New Year's Day", "countryCode": "HR" },
              { "date": "2026-01-06", "localName": "Sveta tri kralja", "name": "Epiphany", "countryCode": "HR" }
            ]
            """;
            var provider = MakeProvider(json);

            var result = await provider.GetPublicHolidays(2026, "HR");

            result.Should().HaveCount(2);
            result[0].Date.Should().Be(new DateOnly(2026, 1, 1));
            result[0].LocalName.Should().Be("Nova godina");
            result[0].CountryCode.Should().Be("HR");
        }

        [Fact]
        public async Task GetAvailableCountries_MapsCodeAndName()
        {
            var json = """[ { "countryCode": "HR", "name": "Croatia" }, { "countryCode": "SI", "name": "Slovenia" } ]""";
            var provider = MakeProvider(json);

            var result = await provider.GetAvailableCountries();

            result.Should().HaveCount(2);
            result.Should().ContainSingle(c => c.CountryCode == "HR" && c.Name == "Croatia");
        }

        [Fact]
        public async Task GetPublicHolidays_Throws_OnNonSuccess()
        {
            var provider = MakeProvider("{}", HttpStatusCode.InternalServerError);

            await Assert.ThrowsAsync<HolidayProviderException>(() => provider.GetPublicHolidays(2026, "HR"));
        }

        private class StubHandler : HttpMessageHandler
        {
            private readonly string json;
            private readonly HttpStatusCode status;
            public StubHandler(string json, HttpStatusCode status = HttpStatusCode.OK) { this.json = json; this.status = status; }
            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
                => Task.FromResult(new HttpResponseMessage(status)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                });
        }
    }
}
