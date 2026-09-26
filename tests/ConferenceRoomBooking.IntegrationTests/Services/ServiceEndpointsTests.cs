using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Services;

[Collection(nameof(ApiCollection))]
public sealed class ServiceEndpointsTests(ApiFactory factory)
{
    private readonly HttpClient _anonymous = factory.CreateClient();

    [Fact]
    public async Task List_IsAnonymous_AndIncludesTheSeededServices()
    {
        var services = await _anonymous.GetFromJsonAsync<List<ServiceResponse>>("/api/services");

        Assert.Contains(new ServiceResponse(InitialCatalog.Projector.Id, "Projector", 500m), services!);
        Assert.Contains(new ServiceResponse(InitialCatalog.WiFi.Id, "Wi-Fi", 300m), services!);
        Assert.Contains(new ServiceResponse(InitialCatalog.Sound.Id, "Sound", 700m), services!);
    }

    [Fact]
    public async Task Get_UnknownId_Returns404()
    {
        var response = await _anonymous.GetAsync($"/api/services/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("The service doesn't exist.", problem!.Title);
    }

    [Fact]
    public async Task Create_ReturnsTheServiceWithItsLocation()
    {
        var admin = await factory.LoginAsAdminAsync();
        var name = UniqueName();

        var response = await admin.PostAsJsonAsync("/api/services", new ServiceRequest($"  {name} ", 450.50m));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.Equal((name, 450.50m), (created!.Name, created.StandardPrice));

        var fetched = await _anonymous.GetFromJsonAsync<ServiceResponse>(response.Headers.Location);
        Assert.Equal(created, fetched);
    }

    [Fact]
    public async Task Create_WithTakenNameInOtherCase_Returns409()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PostAsJsonAsync("/api/services", new ServiceRequest("PROJECTOR", 100m));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("{\"name\":\"\",\"standardPrice\":100}", "Name")]
    [InlineData("{\"name\":\"Flipchart\"}", "StandardPrice")]
    [InlineData("{\"name\":\"Flipchart\",\"standardPrice\":-1}", "StandardPrice")]
    [InlineData("{\"name\":\"Flipchart\",\"standardPrice\":100.555}", "StandardPrice")]
    public async Task Create_WithInvalidInput_Returns400ForTheField(string body, string field)
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PostAsync(
            "/api/services", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task Update_ChangesNameAndPrice()
    {
        var admin = await factory.LoginAsAdminAsync();
        var service = await CreateServiceAsync(admin);
        var newName = UniqueName();

        var response = await admin.PutAsJsonAsync($"/api/services/{service.Id}", new ServiceRequest(newName, 99.99m));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var fetched = await _anonymous.GetFromJsonAsync<ServiceResponse>($"/api/services/{service.Id}");
        Assert.Equal(new ServiceResponse(service.Id, newName, 99.99m), fetched);
    }

    [Fact]
    public async Task Update_KeepingItsOwnName_Succeeds()
    {
        var admin = await factory.LoginAsAdminAsync();
        var service = await CreateServiceAsync(admin);

        var response = await admin.PutAsJsonAsync(
            $"/api/services/{service.Id}", new ServiceRequest(service.Name.ToUpperInvariant(), 10m));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_ToAnotherServicesName_Returns409()
    {
        var admin = await factory.LoginAsAdminAsync();
        var service = await CreateServiceAsync(admin);

        var response = await admin.PutAsJsonAsync($"/api/services/{service.Id}", new ServiceRequest("Wi-Fi", 10m));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Update_UnknownId_Returns404()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.PutAsJsonAsync($"/api/services/{Guid.NewGuid()}", new ServiceRequest(UniqueName(), 10m));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_UnusedService_Returns204AndRemovesIt()
    {
        var admin = await factory.LoginAsAdminAsync();
        var service = await CreateServiceAsync(admin);

        var response = await admin.DeleteAsync($"/api/services/{service.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var fetched = await _anonymous.GetAsync($"/api/services/{service.Id}");
        Assert.Equal(HttpStatusCode.NotFound, fetched.StatusCode);
    }

    [Fact]
    public async Task Delete_ServiceARoomOffers_Returns409()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.DeleteAsync($"/api/services/{InitialCatalog.Projector.Id}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Delete_UnknownId_Returns404()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.DeleteAsync($"/api/services/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ChangingTheCatalog_WithoutToken_Returns401()
    {
        var request = new ServiceRequest(UniqueName(), 10m);

        Assert.Equal(HttpStatusCode.Unauthorized, (await _anonymous.PostAsJsonAsync("/api/services", request)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await _anonymous.PutAsJsonAsync($"/api/services/{InitialCatalog.Sound.Id}", request)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await _anonymous.DeleteAsync($"/api/services/{InitialCatalog.Sound.Id}")).StatusCode);
    }

    [Fact]
    public async Task ChangingTheCatalog_AsClient_Returns403()
    {
        var client = await factory.LoginAsNewClientAsync();
        var request = new ServiceRequest(UniqueName(), 10m);

        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/services", request)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await client.PutAsJsonAsync($"/api/services/{InitialCatalog.Sound.Id}", request)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await client.DeleteAsync($"/api/services/{InitialCatalog.Sound.Id}")).StatusCode);
    }

    private static string UniqueName() => $"Service {Guid.NewGuid():N}";

    private static async Task<ServiceResponse> CreateServiceAsync(HttpClient admin)
    {
        var response = await admin.PostAsJsonAsync("/api/services", new ServiceRequest(UniqueName(), 100m));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ServiceResponse>())!;
    }
}
