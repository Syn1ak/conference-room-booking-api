using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Rooms;

[Collection(nameof(ApiCollection))]
public sealed class RoomReadEndpointsTests(ApiFactory factory)
{
    private readonly HttpClient _anonymous = factory.CreateClient();

    [Fact]
    public async Task List_IsAnonymous_AndIncludesTheSeededRoomsWithTheirServices()
    {
        var rooms = await _anonymous.GetFromJsonAsync<List<RoomResponse>>("/api/rooms");

        var roomB = Assert.Single(rooms!, room => room.Id == InitialCatalog.RoomB.Id);
        Assert.Equal(("Room B", 100, 3500m), (roomB.Name, roomB.Capacity, roomB.HourlyPrice));
        Assert.Equal(
            [
                new OfferedServiceResponse(InitialCatalog.Projector.Id, "Projector", 500m),
                new OfferedServiceResponse(InitialCatalog.Sound.Id, "Sound", 700m),
                new OfferedServiceResponse(InitialCatalog.WiFi.Id, "Wi-Fi", 300m),
            ],
            roomB.Services);
        Assert.Contains(rooms!, room => room.Id == InitialCatalog.RoomA.Id);
        Assert.Contains(rooms!, room => room.Id == InitialCatalog.RoomC.Id);
    }

    [Fact]
    public async Task Get_IsAnonymous_AndReturnsTheRoom()
    {
        var room = await _anonymous.GetFromJsonAsync<RoomResponse>($"/api/rooms/{InitialCatalog.RoomC.Id}");

        Assert.Equal(("Room C", 30, 1500m), (room!.Name, room.Capacity, room.HourlyPrice));
        Assert.Equal(3, room.Services.Count);
    }

    [Fact]
    public async Task Get_UnknownId_Returns404()
    {
        var response = await _anonymous.GetAsync($"/api/rooms/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("The room doesn't exist.", problem!.Title);
    }
}
