using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ConferenceRoomBooking.IntegrationTests.Client;

[Collection(nameof(ApiCollection))]
public sealed class ClientAppTests(ApiFactory factory) : IDisposable
{
    private const string IndexHtml = "<!doctype html><title>Conference Room Booking</title><app-root></app-root>";

    private readonly string _webRoot = Directory.CreateTempSubdirectory("client-").FullName;

    private HttpClient CreateClient(bool withBuiltClient = true)
    {
        if (withBuiltClient)
        {
            File.WriteAllText(Path.Combine(_webRoot, "index.html"), IndexHtml);
            File.WriteAllText(Path.Combine(_webRoot, "main-ABC123.js"), "console.log('client');");
        }

        return factory
            .WithWebHostBuilder(builder => builder.UseWebRoot(_webRoot))
            .CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/bookings/0f8fad5b-d9cb-469f-a165-70867728950e")]
    [InlineData("/admin/reports?from=2026-09-01&to=2026-09-30")]
    public async Task ClientRoute_WithoutAToken_ReturnsTheClientsIndexPage(string path)
    {
        using var client = CreateClient();

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(IndexHtml, await response.Content.ReadAsStringAsync());
        Assert.True(response.Headers.CacheControl?.NoCache);
    }

    [Fact]
    public async Task HashedBundle_IsServedAndCachedForAYear()
    {
        using var client = CreateClient();

        var response = await client.GetAsync("/main-ABC123.js");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(TimeSpan.FromDays(365), response.Headers.CacheControl?.MaxAge);
    }

    [Theory]
    [InlineData("/api/nope")]
    [InlineData("/api")]
    [InlineData("/API/Nope")]
    [InlineData("/swagger/nope")]
    public async Task UnknownApiRoute_StaysA404ProblemDetails(string path)
    {
        using var client = CreateClient();

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Theory]
    [InlineData("/health", "Healthy")]
    [InlineData("/openapi/v1.json", "\"openapi\"")]
    [InlineData("/swagger/index.html", "swagger")]
    public async Task HealthAndDocumentation_AreNotTakenOverByTheClient(string path, string expectedContent)
    {
        using var client = CreateClient();

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(expectedContent, await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ClientRoute_WithoutABuiltClient_Returns404()
    {
        using var client = CreateClient(withBuiltClient: false);

        var response = await client.GetAsync("/rooms");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    public void Dispose() => Directory.Delete(_webRoot, recursive: true);
}
