using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Reports;
using Microsoft.AspNetCore.Mvc;
using static ConferenceRoomBooking.IntegrationTests.Reports.ReportTestBookings;

namespace ConferenceRoomBooking.IntegrationTests.Reports;

[Collection(nameof(ApiCollection))]
public sealed class OccupancyReportEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Occupancy_ComparesBookedHoursWithOpenHours_AndAttendeesWithCapacity()
    {
        var admin = await factory.LoginAsAdminAsync();
        var client = await factory.LoginAsNewClientAsync();
        var roomId = await admin.CreateRoomAsync(capacity: 20, hourlyPrice: 1000m);
        var day = VenueTime.UniqueDay();
        await client.BookAsync(roomId, VenueTime.At(day, 10), VenueTime.At(day, 12), attendeeCount: 5);
        await client.BookAsync(roomId, VenueTime.At(day, 14), VenueTime.At(day, 15, 30), attendeeCount: 15);
        await client.CancelAsync(
            await client.BookAsync(roomId, VenueTime.At(day, 19), VenueTime.At(day, 20), attendeeCount: 20));

        var report = await admin.GetFromJsonAsync<OccupancyReportResponse>(
            $"/api/reports/occupancy?{PeriodQuery(day, day)}", ApiJson.Options);

        var expected = new OccupancyFiguresResponse(
            2, 3.5m, 17m, 0.2059m, 10m, 0.5m, new CancellationFiguresResponse(1, 0.3333m, 800m));
        var room = Assert.Single(report!.Rooms, room => room.RoomId == roomId);
        Assert.Equal(20, room.Capacity);
        Assert.Equal(expected, room.Occupancy);
        Assert.Equal(3.5m, report.Overall.BookedHours);
        Assert.Equal(17m * report.Rooms.Count, report.Overall.OpenHours);
    }

    [Fact]
    public async Task Occupancy_WithInvalidPeriod_Returns400()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.GetAsync("/api/reports/occupancy?from=2026-09-02&to=2026-09-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("To", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Occupancy_WithoutToken_Returns401()
    {
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/reports/occupancy?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Occupancy_AsClient_Returns403()
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.GetAsync("/api/reports/occupancy?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
