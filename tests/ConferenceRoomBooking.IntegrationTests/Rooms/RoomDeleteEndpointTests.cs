using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Api.Services;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.IntegrationTests.Rooms;

[Collection(nameof(ApiCollection))]
public sealed class RoomDeleteEndpointTests(ApiFactory factory)
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    private readonly HttpClient _anonymous = factory.CreateClient();

    [Fact]
    public async Task Delete_RoomWithoutBookings_Returns204AndRemovesItWithItsOfferings()
    {
        var admin = await factory.LoginAsAdminAsync();
        var serviceResponse = await admin.PostAsJsonAsync("/api/services", new ServiceRequest($"Service {Guid.NewGuid():N}", 50m));
        var service = (await serviceResponse.Content.ReadFromJsonAsync<ServiceResponse>())!;
        var room = await CreateRoomAsync(admin, service.Id);

        var response = await admin.DeleteAsync($"/api/rooms/{room.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _anonymous.GetAsync($"/api/rooms/{room.Id}")).StatusCode);
        // The service was only offered by the deleted room, so nothing uses it any more.
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/services/{service.Id}")).StatusCode);
    }

    [Fact]
    public async Task Delete_RoomWithOnlyACancelledBooking_Returns409()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync(admin);
        await SaveCancelledBookingAsync(room.Id);

        var response = await admin.DeleteAsync($"/api/rooms/{room.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _anonymous.GetAsync($"/api/rooms/{room.Id}")).StatusCode);
    }

    [Fact]
    public async Task Delete_UnknownRoom_Returns404()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.DeleteAsync($"/api/rooms/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_WithoutTokenOrAsClient_IsRejected()
    {
        var client = await factory.LoginAsNewClientAsync();

        var anonymousResponse = await _anonymous.DeleteAsync($"/api/rooms/{InitialCatalog.RoomC.Id}");
        var clientResponse = await client.DeleteAsync($"/api/rooms/{InitialCatalog.RoomC.Id}");

        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, clientResponse.StatusCode);
    }

    private static async Task<RoomResponse> CreateRoomAsync(HttpClient admin, Guid? serviceId = null)
    {
        var response = await admin.PostAsJsonAsync(
            "/api/rooms",
            new RoomRequest(
                $"Room {Guid.NewGuid():N}",
                10,
                500m,
                [new OfferedServiceRequest(serviceId ?? InitialCatalog.Projector.Id, null)]));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoomResponse>())!;
    }

    // Bookings can't be made through the API in this test's setup, so it saves one directly.
    private async Task SaveCancelledBookingAsync(Guid roomId)
    {
        var client = await factory.LoginAsNewClientAsync();
        var me = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var room = await dbContext.Rooms.Include(r => r.Offerings).SingleAsync(r => r.Id == roomId);

        var now = DateTimeOffset.UtcNow;
        var localStart = TimeZoneInfo.ConvertTime(now, Kyiv).Date.AddDays(7).AddHours(10);
        var start = new DateTimeOffset(localStart, Kyiv.GetUtcOffset(localStart));
        var slot = BookingSlot.Create(start, start.AddHours(1), now, Kyiv).Value;
        var booking = Booking.Create(room, me!.UserId, slot, 5, [], Kyiv).Value;
        booking.Cancel(now);

        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync();
    }
}
