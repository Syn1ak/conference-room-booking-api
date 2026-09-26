using System.Net;
using System.Net.Http.Json;
using System.Text;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Rooms;

[Collection(nameof(ApiCollection))]
public sealed class RoomCreateEndpointTests(ApiFactory factory)
{
    private readonly HttpClient _anonymous = factory.CreateClient();

    [Fact]
    public async Task Create_WithGivenAndStandardPrices_ReturnsTheRoomWithItsLocation()
    {
        var admin = await factory.LoginAsAdminAsync();
        var name = UniqueName();
        var request = new RoomRequest(
            name,
            20,
            1200m,
            [
                new OfferedServiceRequest(InitialCatalog.Projector.Id, 650m),
                new OfferedServiceRequest(InitialCatalog.WiFi.Id, null),
            ]);

        var response = await admin.PostAsJsonAsync("/api/rooms", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<RoomResponse>();
        Assert.Equal((name, 20, 1200m), (created!.Name, created.Capacity, created.HourlyPrice));
        Assert.Equal(
            [
                new OfferedServiceResponse(InitialCatalog.Projector.Id, "Projector", 650m),
                new OfferedServiceResponse(InitialCatalog.WiFi.Id, "Wi-Fi", 300m),
            ],
            created.Services);

        var fetched = await _anonymous.GetFromJsonAsync<RoomResponse>(response.Headers.Location);
        Assert.Equal(created.Services, fetched!.Services);
        Assert.Equal(created.Id, fetched.Id);
    }

    [Fact]
    public async Task Create_WithoutServices_OffersNone()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PostAsJsonAsync("/api/rooms", new RoomRequest(UniqueName(), 10, 500m, []));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<RoomResponse>();
        Assert.Empty(created!.Services);
    }

    [Fact]
    public async Task Create_WithServiceNotInCatalog_Returns400()
    {
        var admin = await factory.LoginAsAdminAsync();
        var unknownId = Guid.NewGuid();

        var response = await admin.PostAsJsonAsync(
            "/api/rooms", new RoomRequest(UniqueName(), 10, 500m, [new OfferedServiceRequest(unknownId, null)]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(unknownId.ToString(), Assert.Single(problem!.Errors["Services"]));
    }

    [Fact]
    public async Task Create_WithTheSameServiceTwice_Returns400()
    {
        var admin = await factory.LoginAsAdminAsync();
        OfferedServiceRequest sound = new(InitialCatalog.Sound.Id, null);

        var response = await admin.PostAsJsonAsync("/api/rooms", new RoomRequest(UniqueName(), 10, 500m, [sound, sound]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithTakenNameInOtherCase_Returns409()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PostAsJsonAsync("/api/rooms", new RoomRequest("room a", 10, 500m, []));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("""{"name":"R","capacity":0,"hourlyPrice":100,"services":[]}""", "Capacity")]
    [InlineData("""{"name":"R","hourlyPrice":100,"services":[]}""", "Capacity")]
    [InlineData("""{"name":"R","capacity":5,"hourlyPrice":-1,"services":[]}""", "HourlyPrice")]
    [InlineData("""{"name":"R","capacity":5,"hourlyPrice":100.001,"services":[]}""", "HourlyPrice")]
    [InlineData("""{"name":"R","capacity":5,"hourlyPrice":100}""", "Services")]
    [InlineData("""{"name":"R","capacity":5,"hourlyPrice":100,"services":[{"price":10}]}""", "Services[0].ServiceId")]
    public async Task Create_WithInvalidInput_Returns400ForTheField(string body, string field)
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PostAsync("/api/rooms", new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task Create_WithoutToken_Returns401()
    {
        var response = await _anonymous.PostAsJsonAsync("/api/rooms", new RoomRequest(UniqueName(), 10, 500m, []));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsClient_Returns403()
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.PostAsJsonAsync("/api/rooms", new RoomRequest(UniqueName(), 10, 500m, []));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static string UniqueName() => $"Room {Guid.NewGuid():N}";
}
