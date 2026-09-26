using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Reports;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Api.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;
using static ConferenceRoomBooking.IntegrationTests.Reports.ReportTestBookings;

namespace ConferenceRoomBooking.IntegrationTests.Reports;

[Collection(nameof(ApiCollection))]
public sealed class ServiceUptakeReportEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Services_CountsConfirmedBookingsWithEachService_AtTheSavedPrices()
    {
        var admin = await factory.LoginAsAdminAsync();
        var client = await factory.LoginAsNewClientAsync();
        var roomId = await admin.CreateRoomAsync(capacity: 20, hourlyPrice: 1000m);
        var day = VenueTime.UniqueDay();
        await client.BookAsync(roomId, VenueTime.At(day, 10), VenueTime.At(day, 11), withProjector: true);
        await client.BookAsync(roomId, VenueTime.At(day, 11), VenueTime.At(day, 12));
        await client.CancelAsync(
            await client.BookAsync(roomId, VenueTime.At(day, 12), VenueTime.At(day, 13), withProjector: true));
        await RaiseProjectorPriceAsync(admin, roomId, 900m);

        var report = await admin.GetFromJsonAsync<ServiceUptakeReportResponse>(
            $"/api/reports/services?{PeriodQuery(day, day)}", ApiJson.Options);

        Assert.Equal(2, report!.BookingCount);
        Assert.Equal(
            new ServiceUptakeResponse(InitialCatalog.Projector.Id, "Projector", 1, 0.5m, 500m),
            Assert.Single(report.Services, service => service.ServiceId == InitialCatalog.Projector.Id));
        Assert.Equal(
            new ServiceUptakeResponse(InitialCatalog.Sound.Id, "Sound", 0, 0m, 0m),
            Assert.Single(report.Services, service => service.ServiceId == InitialCatalog.Sound.Id));
        var catalog = await admin.GetFromJsonAsync<List<ServiceResponse>>("/api/services");
        Assert.Equal(catalog!.Count, report.Services.Count);
    }

    [Fact]
    public async Task Services_WithInvalidPeriod_Returns400()
    {
        var admin = await factory.LoginAsAdminAsync();

        var response = await admin.GetAsync("/api/reports/services?to=2026-09-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("From", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Services_WithoutToken_Returns401()
    {
        using var anonymous = factory.CreateClient();

        var response = await anonymous.GetAsync("/api/reports/services?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Services_AsClient_Returns403()
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.GetAsync("/api/reports/services?from=2026-09-01&to=2026-09-01");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task RaiseProjectorPriceAsync(HttpClient admin, Guid roomId, decimal price)
    {
        var room = await admin.GetFromJsonAsync<RoomResponse>($"/api/rooms/{roomId}");
        var response = await admin.PutAsJsonAsync(
            $"/api/rooms/{roomId}",
            new RoomRequest(
                room!.Name,
                room.Capacity,
                room.HourlyPrice,
                [new OfferedServiceRequest(InitialCatalog.Projector.Id, price)]));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
