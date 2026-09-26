using System.Text.Json;
using System.Text.Json.Serialization;

namespace ConferenceRoomBooking.IntegrationTests;

/// <summary>
/// JSON settings matching the API's, which sends enums as their names.
/// </summary>
internal static class ApiJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
}
