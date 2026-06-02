using System.Text.Json;
using System.Text.Json.Serialization;

namespace Appy.Utils
{
    /// <summary>
    /// Globally-registered converter that trims leading/trailing whitespace from
    /// every string read from a JSON request body. Opt a property out with
    /// [JsonConverter(typeof(NoTrimStringConverter))] (e.g. password fields).
    /// </summary>
    public class TrimmingStringConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => reader.GetString()?.Trim();

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}
