using System.Text.Json;
using System.Text.Json.Serialization;

namespace Appy.Utils
{
    /// <summary>
    /// Pass-through string converter (no trimming). Apply via
    /// [JsonConverter(typeof(NoTrimStringConverter))] to opt a property out of the
    /// globally-registered <see cref="TrimmingStringConverter"/> — used for
    /// passwords, where surrounding whitespace is significant.
    /// </summary>
    public class NoTrimStringConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => reader.GetString();

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}
