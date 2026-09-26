using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Venue;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.IntegrationTests.Venue;

[Collection(nameof(ApiCollection))]
public sealed class VenueEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Get_WithoutAToken_ReturnsTheBookingRules()
    {
        using var client = factory.CreateClient();

        var venue = await client.GetFromJsonAsync<VenueResponse>("/api/venue", ApiJson.Options);

        Assert.Equal("Europe/Kyiv", venue!.TimeZone);
        Assert.Equal((new TimeOnly(6, 0), new TimeOnly(23, 0)), (venue.OpeningTime, venue.ClosingTime));
        Assert.Equal((15, 30, 1), (venue.TimeStepMinutes, venue.MinimumDurationMinutes, venue.MaximumYearsAhead));
        Assert.Equal(
            [
                new TimeBandResponse(TimeBandKind.Morning, new TimeOnly(6, 0), new TimeOnly(9, 0), 0.90m),
                new TimeBandResponse(TimeBandKind.Standard, new TimeOnly(9, 0), new TimeOnly(12, 0), 1.00m),
                new TimeBandResponse(TimeBandKind.Peak, new TimeOnly(12, 0), new TimeOnly(14, 0), 1.15m),
                new TimeBandResponse(TimeBandKind.Standard, new TimeOnly(14, 0), new TimeOnly(18, 0), 1.00m),
                new TimeBandResponse(TimeBandKind.Evening, new TimeOnly(18, 0), new TimeOnly(23, 0), 0.80m),
            ],
            venue.Bands);
    }

    [Fact]
    public async Task Get_MayBeCachedForAnHour()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/venue");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.Public);
        Assert.Equal(TimeSpan.FromHours(1), response.Headers.CacheControl.MaxAge);
    }
}
