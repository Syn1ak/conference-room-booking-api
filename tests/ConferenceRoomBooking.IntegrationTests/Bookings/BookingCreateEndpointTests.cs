using System.Net;
using System.Net.Http.Json;
using System.Text;
using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Bookings;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Api.Rooms;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Bookings;

[Collection(nameof(ApiCollection))]
public sealed class BookingCreateEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Create_PricingExampleFromAdr0004_ReturnsTheBreakdownAndItsLocation()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var request = new CreateBookingRequest(
            InitialCatalog.RoomA.Id,
            VenueTime.At(day, 11),
            VenueTime.At(day, 15),
            20,
            [InitialCatalog.Projector.Id, InitialCatalog.WiFi.Id]);

        var response = await client.PostAsJsonAsync("/api/bookings", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var confirmation = await response.Content.ReadFromJsonAsync<BookingConfirmationResponse>(ApiJson.Options);
        Assert.Equal(
            [
                (TimeBandKind.Standard, 1m, 2000.00m),
                (TimeBandKind.Peak, 2m, 4600.00m),
                (TimeBandKind.Standard, 1m, 2000.00m),
            ],
            confirmation!.RentalLines.Select(line => (line.Band, line.Hours, line.Amount)));
        Assert.Equal(
            [
                new BookedServiceResponse(InitialCatalog.Projector.Id, "Projector", 500m),
                new BookedServiceResponse(InitialCatalog.WiFi.Id, "Wi-Fi", 300m),
            ],
            confirmation.Services);
        Assert.Equal((8600m, 9400m), (confirmation.RentalPrice, confirmation.TotalPrice));
        Assert.Equal((240, 20, 2000m), (confirmation.DurationMinutes, confirmation.AttendeeCount, confirmation.RoomHourlyPrice));
        Assert.Equal(request.Start, confirmation.Start);
        Assert.Equal(VenueTime.Kyiv.GetUtcOffset(request.Start!.Value), confirmation.Start.Offset);

        var fetched = await client.GetFromJsonAsync<BookingResponse>(response.Headers.Location, ApiJson.Options);
        Assert.Equal(confirmation.Id, fetched!.Id);
        Assert.Equal((BookingStatus.Confirmed, 8600m, 9400m), (fetched.Status, fetched.RentalPrice, fetched.TotalPrice));
        Assert.Equal(confirmation.Services, fetched.Services);
        Assert.Null(fetched.CancelledAt);
    }

    [Fact]
    public async Task Create_WithoutServices_ChargesOnlyTheRental()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(InitialCatalog.RoomC.Id, VenueTime.At(day, 7), VenueTime.At(day, 9, 30), 10, null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var confirmation = await response.Content.ReadFromJsonAsync<BookingConfirmationResponse>(ApiJson.Options);
        // Morning (−10%) 07:00–09:00, then standard 09:00–09:30.
        Assert.Equal((2 * 1500m * 0.9m) + 750m, confirmation!.TotalPrice);
        Assert.Empty(confirmation.Services);
    }

    [Fact]
    public async Task Create_OverlappingAConfirmedBooking_Returns409_ButBackToBackSucceeds()
    {
        var room = await CreateRoomAsync();
        var day = VenueTime.UniqueDay();
        var first = await factory.LoginAsNewClientAsync();
        var second = await factory.LoginAsNewClientAsync();
        await first.PostAsJsonAsync("/api/bookings", Request(room.Id, VenueTime.At(day, 10), VenueTime.At(day, 12)));

        var overlapping = await second.PostAsJsonAsync(
            "/api/bookings", Request(room.Id, VenueTime.At(day, 11, 45), VenueTime.At(day, 13)));
        var backToBack = await second.PostAsJsonAsync(
            "/api/bookings", Request(room.Id, VenueTime.At(day, 12), VenueTime.At(day, 13)));

        Assert.Equal(HttpStatusCode.Conflict, overlapping.StatusCode);
        var problem = await overlapping.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(BookingErrors.SlotTaken.Description, problem!.Title);
        Assert.Equal(HttpStatusCode.Created, backToBack.StatusCode);
    }

    [Fact]
    public async Task Create_ConcurrentRequestsForTheSameSlot_BookItExactlyOnce()
    {
        var room = await CreateRoomAsync();
        var day = VenueTime.UniqueDay();
        var clients = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => factory.LoginAsNewClientAsync()));

        var responses = await Task.WhenAll(clients.Select(client =>
            client.PostAsJsonAsync("/api/bookings", Request(room.Id, VenueTime.At(day, 16), VenueTime.At(day, 18)))));

        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(response => response.StatusCode != HttpStatusCode.Created),
            response => Assert.Equal(HttpStatusCode.Conflict, response.StatusCode));
    }

    [Fact]
    public async Task Create_AfterTheRoomsPricesChange_KeepsTheEarlierBookingsPrices()
    {
        var admin = await factory.LoginAsAdminAsync();
        var room = await CreateRoomAsync();
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var booked = await client.PostAsJsonAsync(
            "/api/bookings", Request(room.Id, VenueTime.At(day, 10), VenueTime.At(day, 11), InitialCatalog.Projector.Id));
        var confirmation = await booked.Content.ReadFromJsonAsync<BookingConfirmationResponse>(ApiJson.Options);

        await admin.PutAsJsonAsync(
            $"/api/rooms/{room.Id}", new RoomRequest(room.Name, room.Capacity, 9999m, []));

        var fetched = await client.GetFromJsonAsync<BookingResponse>($"/api/bookings/{confirmation!.Id}", ApiJson.Options);
        Assert.Equal((1000m, 1000m, 1500m), (fetched!.RoomHourlyPrice, fetched.RentalPrice, fetched.TotalPrice));
        Assert.Equal("Projector", Assert.Single(fetched.Services).Name);
    }

    [Fact]
    public async Task Create_ForUnknownRoom_Returns404()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();

        var response = await client.PostAsJsonAsync(
            "/api/bookings", Request(Guid.NewGuid(), VenueTime.At(day, 10), VenueTime.At(day, 11)));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithServiceTheRoomDoesntOffer_Returns400()
    {
        var room = await CreateRoomAsync();
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();

        var response = await client.PostAsJsonAsync(
            "/api/bookings", Request(room.Id, VenueTime.At(day, 10), VenueTime.At(day, 11), InitialCatalog.Sound.Id));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("ServiceIds", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Create_ForMorePeopleThanTheRoomHolds_Returns400()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(InitialCatalog.RoomC.Id, VenueTime.At(day, 10), VenueTime.At(day, 11), 31, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("AttendeeCount", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Create_OutsideOpeningHours_Returns400()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();

        var response = await client.PostAsJsonAsync(
            "/api/bookings", Request(InitialCatalog.RoomC.Id, VenueTime.At(day, 22), VenueTime.At(day, 23, 30)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithTimeWithoutOffset_Returns400()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var body = $$"""
            {"roomId":"{{InitialCatalog.RoomC.Id}}","start":"{{day:yyyy-MM-dd}}T10:00:00","end":"{{day:yyyy-MM-dd}}T11:00:00+03:00","attendeeCount":1}
            """;

        var response = await client.PostAsync("/api/bookings", new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(
            OffsetRequiredDateTimeOffsetBinder.MissingOffsetMessage,
            problem!.Errors.Values.SelectMany(messages => messages));
    }

    [Theory]
    [InlineData("""{"start":"2030-01-01T10:00:00Z","end":"2030-01-01T11:00:00Z","attendeeCount":1}""", "RoomId")]
    [InlineData("""{"roomId":"819515e4-aae1-42d5-b99d-e52dae949c5b","end":"2030-01-01T11:00:00Z","attendeeCount":1}""", "Start")]
    [InlineData("""{"roomId":"819515e4-aae1-42d5-b99d-e52dae949c5b","start":"2030-01-01T10:00:00Z","end":"2030-01-01T11:00:00Z"}""", "AttendeeCount")]
    public async Task Create_WithMissingField_Returns400ForIt(string body, string field)
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.PostAsync("/api/bookings", new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task Create_WithoutTokenOrAsAdmin_IsRejected()
    {
        var admin = await factory.LoginAsAdminAsync();
        using var anonymous = factory.CreateClient();
        var day = VenueTime.UniqueDay();
        var request = Request(InitialCatalog.RoomC.Id, VenueTime.At(day, 10), VenueTime.At(day, 11));

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/bookings", request)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PostAsJsonAsync("/api/bookings", request)).StatusCode);
    }

    [Fact]
    public async Task Get_OwnerAndAdminCanRead_OtherClientsGet404()
    {
        var owner = await factory.LoginAsNewClientAsync();
        var otherClient = await factory.LoginAsNewClientAsync();
        var admin = await factory.LoginAsAdminAsync();
        var day = VenueTime.UniqueDay();
        var created = await owner.PostAsJsonAsync(
            "/api/bookings", Request(InitialCatalog.RoomC.Id, VenueTime.At(day, 10), VenueTime.At(day, 11)));
        var location = created.Headers.Location;
        var ownerId = (await owner.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me"))!.UserId;

        var asOwner = await owner.GetFromJsonAsync<BookingResponse>(location, ApiJson.Options);
        var asAdmin = await admin.GetFromJsonAsync<BookingResponse>(location, ApiJson.Options);
        var asOtherClient = await otherClient.GetAsync(location);

        Assert.Equal(ownerId, asOwner!.ClientId);
        Assert.Equal(asOwner, asAdmin! with { Services = asOwner.Services });
        Assert.Equal(HttpStatusCode.NotFound, asOtherClient.StatusCode);
    }

    [Fact]
    public async Task Get_UnknownBookingOrWithoutToken_IsRejected()
    {
        var client = await factory.LoginAsNewClientAsync();
        using var anonymous = factory.CreateClient();

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/bookings/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"/api/bookings/{Guid.NewGuid()}")).StatusCode);
    }

    private static CreateBookingRequest Request(
        Guid roomId, DateTimeOffset start, DateTimeOffset end, params Guid[] serviceIds) =>
        new(roomId, start, end, 1, serviceIds);

    private async Task<RoomResponse> CreateRoomAsync()
    {
        var admin = await factory.LoginAsAdminAsync();
        var response = await admin.PostAsJsonAsync(
            "/api/rooms",
            new RoomRequest(
                $"Room {Guid.NewGuid():N}", 10, 1000m, [new OfferedServiceRequest(InitialCatalog.Projector.Id, null)]));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RoomResponse>())!;
    }
}
