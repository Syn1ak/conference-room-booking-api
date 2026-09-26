using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Rooms;

[Collection(nameof(ApiCollection))]
public sealed class RoomSearchEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _anonymous = factory.CreateClient();

    [Fact]
    public async Task Search_TasksExample_ReturnsRoomsAAndBWithTheirRentalPrices()
    {
        var day = VenueTime.UniqueDay();

        var rooms = await SearchAsync(VenueTime.At(day, 10), VenueTime.At(day, 14), capacity: 50);

        // 10:00–12:00 standard, 12:00–14:00 peak (+15%).
        var roomA = Assert.Single(rooms, room => room.Id == InitialCatalog.RoomA.Id);
        Assert.Equal(2 * 2000m + 2 * 2000m * 1.15m, roomA.RentalPrice);
        Assert.Equal(3, roomA.Services.Count);
        var roomB = Assert.Single(rooms, room => room.Id == InitialCatalog.RoomB.Id);
        Assert.Equal(2 * 3500m + 2 * 3500m * 1.15m, roomB.RentalPrice);
        Assert.DoesNotContain(rooms, room => room.Id == InitialCatalog.RoomC.Id);
    }

    [Fact]
    public async Task Search_LeavesOutARoomWithAnOverlappingBooking_ButNotOneBookedBackToBackOrCancelled()
    {
        var admin = await factory.LoginAsAdminAsync();
        var day = VenueTime.UniqueDay();
        var overlapping = await CreateRoomAsync(admin);
        var backToBack = await CreateRoomAsync(admin);
        var cancelled = await CreateRoomAsync(admin);
        await factory.SaveBookingAsync(overlapping.Id, VenueTime.At(day, 13), VenueTime.At(day, 15));
        await factory.SaveBookingAsync(backToBack.Id, VenueTime.At(day, 14), VenueTime.At(day, 15));
        await factory.SaveBookingAsync(cancelled.Id, VenueTime.At(day, 10), VenueTime.At(day, 14), cancelled: true);

        var rooms = await SearchAsync(VenueTime.At(day, 10), VenueTime.At(day, 14), capacity: 1);

        Assert.DoesNotContain(rooms, room => room.Id == overlapping.Id);
        Assert.Contains(rooms, room => room.Id == backToBack.Id);
        Assert.Contains(rooms, room => room.Id == cancelled.Id);
    }

    [Fact]
    public async Task Search_InUtcAndInVenueOffset_GivesTheSameResult()
    {
        var day = VenueTime.UniqueDay();
        var start = VenueTime.At(day, 18);
        var end = VenueTime.At(day, 20);

        var inVenueOffset = await SearchAsync(start, end, capacity: 30);
        var inUtc = await _anonymous.GetFromJsonAsync<List<AvailableRoomResponse>>(
            $"/api/rooms/available?start={start.UtcDateTime:yyyy-MM-ddTHH:mm:ss}Z" +
            $"&end={end.UtcDateTime:yyyy-MM-ddTHH:mm:ss}Z&capacity=30");

        Assert.Equal(
            inVenueOffset.Select(room => (room.Id, room.RentalPrice)),
            inUtc!.Select(room => (room.Id, room.RentalPrice)));
        // Evening (−20%): 2 hours × 1500 × 0.8.
        Assert.Equal(2400m, inUtc!.Single(room => room.Id == InitialCatalog.RoomC.Id).RentalPrice);
    }

    [Theory]
    [InlineData(-2, 10, 0, 12, 0)]
    [InlineData(1, 5, 0, 7, 0)]
    [InlineData(1, 22, 0, 23, 30)]
    [InlineData(1, 10, 10, 12, 0)]
    [InlineData(1, 10, 0, 10, 15)]
    [InlineData(1, 12, 0, 10, 0)]
    public async Task Search_ForATimeThatCantBeBooked_Returns400(
        int daysAhead, int startHour, int startMinute, int endHour, int endMinute)
    {
        var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(daysAhead);

        var response = await _anonymous.GetAsync(Url(
            VenueTime.At(day, startHour, startMinute), VenueTime.At(day, endHour, endMinute), capacity: 1));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Search_WithTimeWithoutOffset_Returns400()
    {
        var day = VenueTime.UniqueDay();

        var response = await _anonymous.GetAsync(
            $"/api/rooms/available?start={day:yyyy-MM-dd}T10:00:00&end={VenueTime.ForQuery(VenueTime.At(day, 12))}&capacity=1");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Equal([OffsetRequiredDateTimeOffsetBinder.MissingOffsetMessage], problem!.Errors["Start"]);
    }

    [Theory]
    [InlineData("end=2030-01-01T10:00:00Z&capacity=1", "Start")]
    [InlineData("start=2030-01-01T10:00:00Z&end=2030-01-01T12:00:00Z", "Capacity")]
    [InlineData("start=2030-01-01T10:00:00Z&end=2030-01-01T12:00:00Z&capacity=0", "Capacity")]
    [InlineData("start=tomorrow&end=2030-01-01T12:00:00Z&capacity=1", "Start")]
    public async Task Search_WithMissingOrInvalidParameter_Returns400ForIt(string query, string field)
    {
        var response = await _anonymous.GetAsync($"/api/rooms/available?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    private static string Url(DateTimeOffset start, DateTimeOffset end, int capacity) =>
        $"/api/rooms/available?start={VenueTime.ForQuery(start)}&end={VenueTime.ForQuery(end)}&capacity={capacity}";

    private async Task<List<AvailableRoomResponse>> SearchAsync(DateTimeOffset start, DateTimeOffset end, int capacity)
    {
        var response = await _anonymous.GetAsync(Url(start, end, capacity));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<List<AvailableRoomResponse>>())!;
    }

    private static async Task<RoomResponse> CreateRoomAsync(HttpClient admin)
    {
        var response = await admin.PostAsJsonAsync("/api/rooms", new RoomRequest($"Room {Guid.NewGuid():N}", 5, 100m, []));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoomResponse>())!;
    }
}
