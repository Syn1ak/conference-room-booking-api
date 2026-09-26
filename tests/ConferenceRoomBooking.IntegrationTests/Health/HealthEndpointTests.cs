using System.Net;

namespace ConferenceRoomBooking.IntegrationTests.Health;

[Collection(nameof(ApiCollection))]
public sealed class HealthEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Health_WithoutAToken_ReportsHealthyWhenTheDatabaseAnswers()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}
