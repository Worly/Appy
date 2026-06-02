using System.Text.Json;
using Appy.DTOs;
using Appy.Utils;

namespace Appy.Tests.Utils
{
    public class TrimmingStringConverterTests
    {
        private static JsonSerializerOptions OptionsWithTrimming()
        {
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
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

        [Fact]
        public void Serialize_DoesNotTrim_WriteIsPassthrough()
        {
            var client = new ClientDTO { Name = "  Jane  ", Contacts = new List<ClientContactDTO>() };

            var json = JsonSerializer.Serialize(client, OptionsWithTrimming());

            Assert.Contains("  Jane  ", json); // value written untrimmed
        }

        [Fact]
        public void Deserialize_TrimsAllFields_ButPreservesRegisterPassword()
        {
            var json = """
            {
                "email": "  a@b.com  ",
                "name": "  Jane  ",
                "surname": "  Doe  ",
                "password": "  s3cr3t  "
            }
            """;

            var dto = JsonSerializer.Deserialize<RegisterDTO>(json, OptionsWithTrimming());

            Assert.NotNull(dto);
            Assert.Equal("a@b.com", dto!.Email);
            Assert.Equal("Jane", dto.Name);
            Assert.Equal("Doe", dto.Surname);
            Assert.Equal("  s3cr3t  ", dto.Password); // password NOT trimmed
        }

        [Fact]
        public void Deserialize_TrimsEmail_ButPreservesLogInPassword()
        {
            var json = """
            {
                "email": "  a@b.com  ",
                "password": "  pw  "
            }
            """;

            var dto = JsonSerializer.Deserialize<LogInDTO>(json, OptionsWithTrimming());

            Assert.NotNull(dto);
            Assert.Equal("a@b.com", dto!.Email);
            Assert.Equal("  pw  ", dto.Password); // password NOT trimmed
        }
    }
}
