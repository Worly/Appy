using System.Text.Json;
using Appy.DTOs;
using Appy.Utils;

namespace Appy.Tests.Utils
{
    public class TrimmingStringConverterTests
    {
        private static JsonSerializerOptions OptionsWithTrimming()
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            options.Converters.Add(new TrimmingStringConverter());
            return options;
        }

        [Fact]
        public void Deserialize_TrimsStrings_AcrossTopLevelNestedAndCollections()
        {
            var json = """
            {
                "name": "  Jane  ",
                "surname": null,
                "notes": "   ",
                "contacts": [ { "type": 0, "value": "  +123  " } ]
            }
            """;

            var dto = JsonSerializer.Deserialize<ClientDTO>(json, OptionsWithTrimming());

            Assert.NotNull(dto);
            Assert.Equal("Jane", dto!.Name);          // top-level trimmed
            Assert.Null(dto.Surname);                  // null preserved
            Assert.Equal("", dto.Notes);               // whitespace-only -> empty
            Assert.Equal("+123", dto.Contacts[0].Value); // nested collection trimmed
        }
    }
}
