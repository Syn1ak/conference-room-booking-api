using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Infrastructure.Identity;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

/// <summary>
/// Helpers for test data that doesn't clash with other tests or the seeded catalog in the shared database.
/// </summary>
internal static class TestData
{
    public const int UniqueIndexViolation = 2601;
    public const int ForeignKeyViolation = 547;

    public static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    /// <summary>"Now" for creating slots: 1 September 2026, 10:00 in Kyiv.</summary>
    public static readonly DateTimeOffset Now = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));

    public static string UniqueName(string prefix) => $"{prefix} {Guid.NewGuid():N}";

    /// <summary>A slot on 2 September 2026, Kyiv time.</summary>
    public static BookingSlot Slot(int startHour, int endHour) => BookingSlot.Create(
        new DateTimeOffset(2026, 9, 2, startHour, 0, 0, TimeSpan.FromHours(3)),
        new DateTimeOffset(2026, 9, 2, endHour, 0, 0, TimeSpan.FromHours(3)),
        Now,
        Kyiv).Value;

    /// <summary>Saves a user account for bookings to belong to and returns its id.</summary>
    public static async Task<Guid> CreateClientAsync(ApplicationDbContext dbContext)
    {
        var email = $"{Guid.NewGuid():N}@persistence.test";
        var client = new ApplicationUser { Id = Guid.NewGuid(), UserName = email, Email = email };
        dbContext.Users.Add(client);
        await dbContext.SaveChangesAsync();
        return client.Id;
    }

    public static int? SqlErrorNumber(DbUpdateException exception) =>
        (exception.InnerException as SqlException)?.Number;
}
