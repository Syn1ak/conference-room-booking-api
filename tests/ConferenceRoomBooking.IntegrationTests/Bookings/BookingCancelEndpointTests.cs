using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Bookings;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Bookings;

[Collection(nameof(ApiCollection))]
public sealed class BookingCancelEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Cancel_ByOwner_KeepsTheBookingAsCancelled_AndFreesTheSlot()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var bookingId = await BookAsync(client, VenueTime.At(day, 10), VenueTime.At(day, 12));
        Assert.DoesNotContain(InitialCatalog.RoomC.Id, await AvailableRoomIdsAsync(day));

        var response = await client.PostAsync($"/api/bookings/{bookingId}/cancel", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cancelled = await response.Content.ReadFromJsonAsync<BookingResponse>(ApiJson.Options);
        Assert.Equal(BookingStatus.Cancelled, cancelled!.Status);
        Assert.NotNull(cancelled.CancelledAt);
        var fetched = await client.GetFromJsonAsync<BookingResponse>($"/api/bookings/{bookingId}", ApiJson.Options);
        Assert.Equal(BookingStatus.Cancelled, fetched!.Status);
        Assert.Contains(InitialCatalog.RoomC.Id, await AvailableRoomIdsAsync(day));
    }

    [Fact]
    public async Task Cancel_Twice_Returns409()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var bookingId = await BookAsync(client, VenueTime.At(day, 10), VenueTime.At(day, 12));
        await client.PostAsync($"/api/bookings/{bookingId}/cancel", null);

        var response = await client.PostAsync($"/api/bookings/{bookingId}/cancel", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(BookingErrors.AlreadyCancelled.Description, problem!.Title);
    }

    [Fact]
    public async Task Cancel_AnotherClientsBooking_Returns404AndLeavesItConfirmed()
    {
        var owner = await factory.LoginAsNewClientAsync();
        var otherClient = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var bookingId = await BookAsync(owner, VenueTime.At(day, 10), VenueTime.At(day, 12));

        var response = await otherClient.PostAsync($"/api/bookings/{bookingId}/cancel", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var fetched = await owner.GetFromJsonAsync<BookingResponse>($"/api/bookings/{bookingId}", ApiJson.Options);
        Assert.Equal(BookingStatus.Confirmed, fetched!.Status);
    }

    [Fact]
    public async Task Cancel_UnknownBooking_Returns404()
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.PostAsync($"/api/bookings/{Guid.NewGuid()}/cancel", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Cancel_WithoutTokenOrAsAdmin_IsRejected()
    {
        var client = await factory.LoginAsNewClientAsync();
        var admin = await factory.LoginAsAdminAsync();
        using var anonymous = factory.CreateClient();
        var day = VenueTime.UniqueDay();
        var bookingId = await BookAsync(client, VenueTime.At(day, 10), VenueTime.At(day, 12));

        Assert.Equal(
            HttpStatusCode.Unauthorized, (await anonymous.PostAsync($"/api/bookings/{bookingId}/cancel", null)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Forbidden, (await admin.PostAsync($"/api/bookings/{bookingId}/cancel", null)).StatusCode);
    }

    private static async Task<Guid> BookAsync(HttpClient client, DateTimeOffset start, DateTimeOffset end)
    {
        var response = await client.PostAsJsonAsync(
            "/api/bookings", new CreateBookingRequest(InitialCatalog.RoomC.Id, start, end, 1, null));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<BookingConfirmationResponse>(ApiJson.Options))!.Id;
    }

    private async Task<IEnumerable<Guid>> AvailableRoomIdsAsync(DateOnly day)
    {
        using var anonymous = factory.CreateClient();
        var rooms = await anonymous.GetFromJsonAsync<List<AvailableRoomResponse>>(
            $"/api/rooms/available?start={VenueTime.ForQuery(VenueTime.At(day, 10))}" +
            $"&end={VenueTime.ForQuery(VenueTime.At(day, 12))}&capacity=1");
        return rooms!.Select(room => room.Id);
    }
}
