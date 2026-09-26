using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Api.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;

namespace ConferenceRoomBooking.IntegrationTests.Rooms;

[Collection(nameof(ApiCollection))]
public sealed class RoomUpdateEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _anonymous = factory.CreateClient();

    [Fact]
    public async Task Update_ChangingTheHourlyPrice_KeepsTheServices()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/rooms/{room.Id}", ToRequest(room) with { HourlyPrice = 2500m });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var fetched = await _anonymous.GetFromJsonAsync<RoomResponse>($"/api/rooms/{room.Id}");
        Assert.Equal(2500m, fetched!.HourlyPrice);
        Assert.Equal(room.Services, fetched.Services);
    }

    [Fact]
    public async Task Update_AddingAServiceAtItsOwnPrice_OffersIt()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync(admin);
        var request = ToRequest(room);

        var response = await admin.PutAsJsonAsync(
            $"/api/rooms/{room.Id}",
            request with { Services = [.. request.Services, new OfferedServiceRequest(InitialCatalog.Sound.Id, 700m)] });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<RoomResponse>();
        Assert.Contains(new OfferedServiceResponse(InitialCatalog.Sound.Id, "Sound", 700m), updated!.Services);
        Assert.Equal(3, updated.Services.Count);
    }

    [Fact]
    public async Task Update_LeavingAServiceOut_StopsOfferingIt_AndTheServiceCanThenBeDeleted()
    {
        var admin = await factory.LoginAsAdminAsync();
        var serviceResponse = await admin.PostAsJsonAsync(
            "/api/services", new ServiceRequest($"Service {Guid.NewGuid():N}", 50m));
        var service = (await serviceResponse.Content.ReadFromJsonAsync<ServiceResponse>())!;
        var room = await CreateRoomAsync(admin, extraServiceId: service.Id);

        var response = await admin.PutAsJsonAsync($"/api/rooms/{room.Id}", ToRequest(room) with { Services = [] });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await response.Content.ReadFromJsonAsync<RoomResponse>())!.Services);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/services/{service.Id}")).StatusCode);
    }

    [Fact]
    public async Task Update_KeepingItsOwnNameInOtherCase_Succeeds()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync(admin);

        var response = await admin.PutAsJsonAsync(
            $"/api/rooms/{room.Id}", ToRequest(room) with { Name = room.Name.ToUpperInvariant() });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_ToAnotherRoomsName_Returns409()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/rooms/{room.Id}", ToRequest(room) with { Name = "Room B" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Update_WithServiceNotInCatalog_Returns400AndChangesNothing()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync(admin);

        var response = await admin.PutAsJsonAsync(
            $"/api/rooms/{room.Id}",
            ToRequest(room) with { HourlyPrice = 1m, Services = [new OfferedServiceRequest(Guid.NewGuid(), null)] });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var fetched = await _anonymous.GetFromJsonAsync<RoomResponse>($"/api/rooms/{room.Id}");
        Assert.Equal((room.HourlyPrice, room.Services.Count), (fetched!.HourlyPrice, fetched.Services.Count));
    }

    [Fact]
    public async Task Update_UnknownRoom_Returns404()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PutAsJsonAsync(
            $"/api/rooms/{Guid.NewGuid()}", new RoomRequest($"Room {Guid.NewGuid():N}", 10, 100m, []));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_WithoutTokenOrAsClient_IsRejected()
    {
        var client = await factory.LoginAsNewClientAsync();
        var request = new RoomRequest("Room A", 50, 1m, []);

        var anonymousResponse = await _anonymous.PutAsJsonAsync($"/api/rooms/{InitialCatalog.RoomA.Id}", request);
        var clientResponse = await client.PutAsJsonAsync($"/api/rooms/{InitialCatalog.RoomA.Id}", request);

        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, clientResponse.StatusCode);
    }

    private static async Task<RoomResponse> CreateRoomAsync(HttpClient admin, Guid? extraServiceId = null)
    {
        List<OfferedServiceRequest> services =
        [
            new(InitialCatalog.Projector.Id, 550m),
            new(InitialCatalog.WiFi.Id, null),
        ];
        if (extraServiceId is { } serviceId)
        {
            services.Add(new OfferedServiceRequest(serviceId, null));
        }

        var response = await admin.PostAsJsonAsync(
            "/api/rooms", new RoomRequest($"Room {Guid.NewGuid():N}", 40, 1800m, services));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoomResponse>())!;
    }

    private static RoomRequest ToRequest(RoomResponse room) => new(
        room.Name,
        room.Capacity,
        room.HourlyPrice,
        [.. room.Services.Select(service => new OfferedServiceRequest(service.ServiceId, service.Price))]);
}
