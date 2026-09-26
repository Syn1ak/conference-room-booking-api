using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.IntegrationTests;

/// <summary>
/// Saves bookings straight to the database, for tests of endpoints other than booking itself.
/// </summary>
internal static class TestBookings
{
    /// <summary>Saves a booking of the room by a new client, optionally cancelled.</summary>
    public static async Task SaveBookingAsync(
        this ApiFactory factory, Guid roomId, DateTimeOffset start, DateTimeOffset end, bool cancelled = false)
    {
        using var client = await factory.LoginAsNewClientAsync();
        var me = await client.GetFromJsonAsync<CurrentUserResponse>("/api/auth/me");

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var room = await dbContext.Rooms.Include(r => r.Offerings).SingleAsync(r => r.Id == roomId);

        var now = DateTimeOffset.UtcNow;
        var slot = BookingSlot.Create(start, end, now, VenueTime.Kyiv).Value;
        var booking = Booking.Create(room, me!.UserId, slot, attendeeCount: 1, [], VenueTime.Kyiv).Value;
        if (cancelled)
        {
            booking.Cancel(now);
        }

        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync();
    }
}
