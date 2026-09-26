namespace ConferenceRoomBooking.IntegrationTests;

/// <summary>
/// Times in the venue's time zone for API tests, which run against the real clock and a shared database.
/// </summary>
internal static class VenueTime
{
    public static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    private static int _daysAhead = 7;

    /// <summary>
    /// A future day that no other test gets, so tests that search or book seeded rooms don't see each other's bookings.
    /// </summary>
    public static DateOnly UniqueDay() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, Kyiv).Date)
            .AddDays(Interlocked.Increment(ref _daysAhead));

    /// <summary>The given wall-clock time on <paramref name="day"/> in Kyiv, with Kyiv's offset on that day.</summary>
    public static DateTimeOffset At(DateOnly day, int hour, int minute = 0)
    {
        var local = day.ToDateTime(new TimeOnly(hour, minute));
        return new DateTimeOffset(local, Kyiv.GetUtcOffset(local));
    }

    /// <summary>The time as ISO 8601 with its offset, escaped for a query string.</summary>
    public static string ForQuery(DateTimeOffset time) => Uri.EscapeDataString(time.ToString("yyyy-MM-ddTHH:mm:sszzz"));
}
