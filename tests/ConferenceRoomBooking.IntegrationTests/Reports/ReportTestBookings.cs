using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Bookings;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;

namespace ConferenceRoomBooking.IntegrationTests.Reports;

/// <summary>
/// Rooms and bookings made through the API for report tests. Each test gets a room of its own and books it on a day
/// no other test uses, so its numbers aren't mixed with other tests' bookings.
/// </summary>
internal static class ReportTestBookings
{
    /// <summary>Creates a room that offers the projector at 500 UAH and returns its id.</summary>
    public static async Task<Guid> CreateRoomAsync(this HttpClient admin, int capacity, decimal hourlyPrice)
    {
        var response = await admin.PostAsJsonAsync(
            "/api/rooms",
            new RoomRequest(
                $"Report room {Guid.NewGuid():N}",
                capacity,
                hourlyPrice,
                [new OfferedServiceRequest(InitialCatalog.Projector.Id, 500m)]));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoomResponse>())!.Id;
    }

    /// <summary>Books the room, optionally with the projector, and returns the booking's id.</summary>
    public static async Task<Guid> BookAsync(
        this HttpClient client,
        Guid roomId,
        DateTimeOffset start,
        DateTimeOffset end,
        int attendeeCount = 1,
        bool withProjector = false)
    {
        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(
                roomId, start, end, attendeeCount, withProjector ? [InitialCatalog.Projector.Id] : null));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<BookingConfirmationResponse>(ApiJson.Options))!.Id;
    }

    public static async Task CancelAsync(this HttpClient client, Guid bookingId)
    {
        var response = await client.PostAsync($"/api/bookings/{bookingId}/cancel", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>The query string for a report period.</summary>
    public static string PeriodQuery(DateOnly from, DateOnly to) => $"from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}";
}
