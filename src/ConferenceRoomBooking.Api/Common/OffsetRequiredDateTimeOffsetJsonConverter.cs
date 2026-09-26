using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ConferenceRoomBooking.Api.Common;

/// <summary>
/// Reads <see cref="DateTimeOffset"/> values in request bodies only if they state their UTC offset, like
/// <see cref="OffsetRequiredDateTimeOffsetBinder"/> does for the query string.
/// </summary>
public sealed class OffsetRequiredDateTimeOffsetJsonConverter : JsonConverter<DateTimeOffset>
{
    public override DateTimeOffset Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String
            || reader.GetString() is not { } value
            || !DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        {
            throw new JsonException(OffsetRequiredDateTimeOffsetBinder.InvalidMessage);
        }

        if (!OffsetRequiredDateTimeOffsetBinder.HasOffset(value))
        {
            throw new JsonException(OffsetRequiredDateTimeOffsetBinder.MissingOffsetMessage);
        }

        return time;
    }

    public override void Write(Utf8JsonWriter writer, DateTimeOffset value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value);
}
