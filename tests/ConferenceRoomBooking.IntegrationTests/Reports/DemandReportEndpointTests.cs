using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Reports;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Domain.Pricing;
using Microsoft.AspNetCore.Mvc;
using static ConferenceRoomBooking.IntegrationTests.Reports.ReportTestBookings;

namespace ConferenceRoomBooking.IntegrationTests.Reports;

[Collection(nameof(ApiCollection))]
public sealed class DemandReportEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Demand_CountsBookedHoursPerBand_OnTheBookingsWeekday()
    {
        var admin = await factory.LoginAsAdminAsync();
        var client = await factory.LoginAsNewClientAsync();
        var roomId = await admin.CreateRoomAsync(capacity: 20, hourlyPrice: 1000m);
        var day = VenueTime.UniqueDay();
        await client.BookAsync(roomId, VenueTime.At(day, 11), VenueTime.At(day, 15));
        await client.CancelAsync(await client.BookAsync(roomId, VenueTime.At(day, 19), VenueTime.At(day, 20)));
        var roomCount = (await admin.GetFromJsonAsync<List<RoomResponse>>("/api/rooms"))!.Count;

        var report = await admin.GetFromJsonAsync<DemandReportResponse>(
            $"/api/reports/demand?{PeriodQuery(day, day)}", ApiJson.Options);

        var expected = new[]
        {
            (TimeBandKind.Morning, 0m, 3m * roomCount),
            (TimeBandKind.Standard, 2m, 7m * roomCount),
            (TimeBandKind.Peak, 2m, 2m * roomCount),
            (TimeBandKind.Evening, 0m, 5m * roomCount),
        };
        Assert.Equal(expected, report!.Bands.Select(band => (band.Band, band.BookedHours, band.AvailableHours)));
        var weekday = Assert.Single(report.Weekdays, weekday => weekday.DayCount > 0);
        Assert.Equal(day.DayOfWeek, weekday.Weekday);
        Assert.Equal(expected, weekday.Bands.Select(band => (band.Band, band.BookedHours, band.AvailableHours)));
    }

    [Fact]
    public async Task Demand_WithInvalidPeriod_Returns400()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.GetAsync("/api/reports/demand?from=2026-01-01&to=2027-01-02");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("To", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Demand_WithoutToken_Returns401()
    {
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/reports/demand?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Demand_AsClient_Returns403()
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.GetAsync("/api/reports/demand?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
