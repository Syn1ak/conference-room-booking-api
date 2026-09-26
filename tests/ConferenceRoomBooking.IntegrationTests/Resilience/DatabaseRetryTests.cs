using System.Net;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Bookings;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.IntegrationTests.Resilience;

[Collection(nameof(ApiCollection))]
public sealed class DatabaseRetryTests(ApiFactory factory)
{
    [Fact]
    public async Task Booking_WhoseFirstInsertFails_IsRetriedAndSavedOnce()
    {
        var interceptor = new FailOnceCommandInterceptor("INSERT INTO [Bookings]");
        await using var failingApi = WithInterceptor(interceptor);
        using var bookingClient = await factory.LoginAsNewClientAsync();
        using var client = failingApi.CreateClient();
        client.DefaultRequestHeaders.Authorization = bookingClient.DefaultRequestHeaders.Authorization;
        var day = VenueTime.UniqueDay();
        var start = VenueTime.At(day, 10);

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(InitialCatalog.RoomA.Id, start, VenueTime.At(day, 12), 10, [InitialCatalog.WiFi.Id]));

        Assert.True(interceptor.HasFailed);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(1, await CountBookingsAsync(InitialCatalog.RoomA.Id, start));
    }

    [Fact]
    public async Task Registration_WhoseFirstInsertFails_IsRetriedAndTheAccountCanLogIn()
    {
        const string password = "Client123!";
        var email = $"retry-{Guid.NewGuid():N}@integration.test";
        var interceptor = new FailOnceCommandInterceptor("INSERT INTO [AspNetUsers]");
        await using var failingApi = WithInterceptor(interceptor);
        using var client = failingApi.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, password));

        Assert.True(interceptor.HasFailed);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    /// <summary>The shared API, with <paramref name="interceptor"/> added to its database commands.</summary>
    private WebApplicationFactory<Program> WithInterceptor(FailOnceCommandInterceptor interceptor) =>
        factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.ConfigureDbContext<ApplicationDbContext>(options => options.AddInterceptors(interceptor))));

    private async Task<int> CountBookingsAsync(Guid roomId, DateTimeOffset start)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await dbContext.Bookings.CountAsync(booking => booking.RoomId == roomId && booking.Slot.Start == start);
    }
}
