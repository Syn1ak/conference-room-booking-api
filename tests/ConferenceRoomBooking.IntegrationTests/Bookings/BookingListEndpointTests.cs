using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Bookings;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.IntegrationTests.Bookings;

[Collection(nameof(ApiCollection))]
public sealed class BookingListEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task List_AsClient_ReturnsOnlyTheirOwnBookings_LatestStartFirst()
    {
        var client = await factory.LoginAsNewClientAsync();
        var otherClient = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var morning = await BookAsync(client, VenueTime.At(day, 8), VenueTime.At(day, 9));
        var evening = await BookAsync(client, VenueTime.At(day, 19), VenueTime.At(day, 20));
        await BookAsync(otherClient, VenueTime.At(day, 10), VenueTime.At(day, 11));

        var page = await client.GetFromJsonAsync<PageResponse<BookingResponse>>("/api/bookings", ApiJson.Options);

        Assert.Equal([evening, morning], page!.Items.Select(booking => booking.Id));
        Assert.Equal((1, 20, 2), (page.Page, page.PageSize, page.TotalCount));
    }

    [Fact]
    public async Task List_AsAdmin_IncludesEveryClientsBookings()
    {
        var admin = await factory.LoginAsAdminAsync();
        var day = VenueTime.UniqueDay();
        var first = await BookAsync(await factory.LoginAsNewClientAsync(), VenueTime.At(day, 8), VenueTime.At(day, 9));
        var second = await BookAsync(await factory.LoginAsNewClientAsync(), VenueTime.At(day, 9), VenueTime.At(day, 10));

        var ids = new List<Guid>();
        PageResponse<BookingResponse> page;
        var pageNumber = 1;
        do
        {
            page = (await admin.GetFromJsonAsync<PageResponse<BookingResponse>>(
                $"/api/bookings?page={pageNumber++}&pageSize=100", ApiJson.Options))!;
            ids.AddRange(page.Items.Select(booking => booking.Id));
        }
        while (ids.Count < page.TotalCount && page.Items.Count > 0);

        Assert.Contains(first, ids);
        Assert.Contains(second, ids);
    }

    [Fact]
    public async Task List_ReturnsTheRequestedPage()
    {
        var client = await factory.LoginAsNewClientAsync();
        var day = VenueTime.UniqueDay();
        var earliest = await BookAsync(client, VenueTime.At(day, 8), VenueTime.At(day, 9));
        await BookAsync(client, VenueTime.At(day, 10), VenueTime.At(day, 11));
        await BookAsync(client, VenueTime.At(day, 12), VenueTime.At(day, 13));

        var page = await client.GetFromJsonAsync<PageResponse<BookingResponse>>(
            "/api/bookings?page=2&pageSize=2", ApiJson.Options);

        Assert.Equal(earliest, Assert.Single(page!.Items).Id);
        Assert.Equal((2, 2, 3), (page.Page, page.PageSize, page.TotalCount));
    }

    [Theory]
    [InlineData("pageSize=101", "pageSize")]
    [InlineData("pageSize=0", "pageSize")]
    [InlineData("page=0", "page")]
    public async Task List_WithPageOutOfRange_Returns400(string query, string field)
    {
        var client = await factory.LoginAsNewClientAsync();

        var response = await client.GetAsync($"/api/bookings?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(field, problem!.Errors.Keys);
    }

    [Fact]
    public async Task List_WithoutToken_Returns401()
    {
        using var anonymous = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/bookings")).StatusCode);
    }

    private static async Task<Guid> BookAsync(HttpClient client, DateTimeOffset start, DateTimeOffset end)
    {
        var response = await client.PostAsJsonAsync(
            "/api/bookings", new CreateBookingRequest(InitialCatalog.RoomC.Id, start, end, 1, null));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<BookingConfirmationResponse>(ApiJson.Options))!.Id;
    }
}
