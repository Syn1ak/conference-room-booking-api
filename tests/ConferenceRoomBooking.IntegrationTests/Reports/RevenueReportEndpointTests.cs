using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Reports;
using ConferenceRoomBooking.Application.Reports;
using Microsoft.AspNetCore.Mvc;
using static ConferenceRoomBooking.IntegrationTests.Reports.ReportTestBookings;

namespace ConferenceRoomBooking.IntegrationTests.Reports;

[Collection(nameof(ApiCollection))]
public sealed class RevenueReportEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Revenue_AddsUpTheSavedPrices_AndCountsCancellationsSeparately()
    {
        var admin = await factory.LoginAsAdminAsync();
        var client = await factory.LoginAsNewClientAsync();
        var roomId = await admin.CreateRoomAsync(capacity: 20, hourlyPrice: 1000m);
        var day = VenueTime.UniqueDay();
        // Standard 2 × 1000 plus the projector, peak 1 × 1150 (cancelled), evening 1 × 800.
        await client.BookAsync(roomId, VenueTime.At(day, 10), VenueTime.At(day, 12), withProjector: true);
        await client.CancelAsync(await client.BookAsync(roomId, VenueTime.At(day, 12), VenueTime.At(day, 13)));
        await client.BookAsync(roomId, VenueTime.At(day, 19), VenueTime.At(day, 20));

        var report = await admin.GetFromJsonAsync<RevenueReportResponse>(
            $"/api/reports/revenue?{PeriodQuery(day, day)}&groupBy=Day", ApiJson.Options);

        var expected = new RevenueFiguresResponse(2, 2800m, 500m, 3300m);
        Assert.Equal(new ReportPeriodResponse(day, day, 1), report!.Period);
        Assert.Equal(RevenueGrouping.Day, report.GroupBy);
        Assert.Equal(expected, report.Confirmed);
        Assert.Equal(expected, report.Upcoming);
        Assert.Equal(new RevenueFiguresResponse(0, 0m, 0m, 0m), report.Earned);
        Assert.Equal(new CancellationFiguresResponse(1, 0.3333m, 1150m), report.Cancellations);

        var room = Assert.Single(report.Rooms, room => room.RoomId == roomId);
        Assert.Equal(expected, room.Revenue);
        Assert.Equal(new CancellationFiguresResponse(1, 0.3333m, 1150m), room.Cancellations);
        Assert.Equal(new PeriodRevenueResponse(day, day, expected), Assert.Single(report.Periods));
    }

    [Fact]
    public async Task Revenue_GroupsByMonthByDefault()
    {
        var admin = await factory.LoginAsAdminAsync();
        var day = VenueTime.UniqueDay();

        var report = await admin.GetFromJsonAsync<RevenueReportResponse>(
            $"/api/reports/revenue?{PeriodQuery(day, day.AddDays(40))}", ApiJson.Options);

        Assert.Equal(RevenueGrouping.Month, report!.GroupBy);
        Assert.Equal(day, report.Periods[0].From);
        Assert.Equal(day.AddDays(40), report.Periods[^1].To);
        Assert.InRange(report.Periods.Count, 2, 3);
    }

    [Theory]
    [InlineData("from=2026-09-02&to=2026-09-01", "To")]
    [InlineData("from=2026-01-01&to=2027-01-02", "To")]
    [InlineData("to=2026-09-01", "From")]
    [InlineData("from=2026-09-01", "To")]
    [InlineData("from=2026-09-31&to=2026-10-01", "From")]
    [InlineData("from=2026-09-01&to=2026-09-01&groupBy=Week", "groupBy")]
    [InlineData("from=2026-09-01&to=2026-09-01&groupBy=7", "groupBy")]
    public async Task Revenue_WithInvalidQuery_Returns400(string query, string field)
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.GetAsync($"/api/reports/revenue?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task Revenue_WithoutToken_Returns401()
    {
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/reports/revenue?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Revenue_AsClient_Returns403()
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.GetAsync("/api/reports/revenue?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
