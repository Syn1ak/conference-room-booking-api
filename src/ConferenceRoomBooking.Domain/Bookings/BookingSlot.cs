using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Bookings;

/// <summary>
/// The time a booking occupies a room, stored in UTC. The start is included and the end is excluded,
/// so back-to-back slots don't overlap.
/// </summary>
public sealed record BookingSlot
{
    /// <summary>Earliest start, in venue local time. Also where the morning pricing band begins.</summary>
    public static readonly TimeOnly OpeningTime = new(6, 0);

    /// <summary>Latest end, in venue local time. Also where the evening pricing band ends.</summary>
    public static readonly TimeOnly ClosingTime = new(23, 0);

    public static readonly TimeSpan TimeStep = TimeSpan.FromMinutes(15);

    public static readonly TimeSpan MinimumDuration = TimeSpan.FromMinutes(30);

    public const int MaximumYearsAhead = 1;

    private BookingSlot(DateTimeOffset start, DateTimeOffset end)
    {
        Start = start;
        End = end;
    }

    public DateTimeOffset Start { get; }

    public DateTimeOffset End { get; }

    public TimeSpan Duration => End - Start;

    /// <summary>
    /// Creates a slot if it's bookable: in the future and within opening hours, on the time grid, and long enough.
    /// Wall-clock rules are checked in <paramref name="venueTimeZone"/>, whatever offset the times were given in.
    /// </summary>
    public static Result<BookingSlot> Create(
        DateTimeOffset start, DateTimeOffset end, DateTimeOffset now, TimeZoneInfo venueTimeZone)
    {
        if (end <= start)
        {
            return BookingErrors.EndNotAfterStart;
        }

        var localStart = TimeZoneInfo.ConvertTime(start, venueTimeZone);
        var localEnd = TimeZoneInfo.ConvertTime(end, venueTimeZone);

        if (!IsWithinOpeningHours(localStart, localEnd))
        {
            return BookingErrors.OutsideOpeningHours;
        }

        if (!IsOnTimeGrid(localStart) || !IsOnTimeGrid(localEnd))
        {
            return BookingErrors.NotOnTimeGrid;
        }

        if (end - start < MinimumDuration)
        {
            return BookingErrors.TooShort;
        }

        if (start <= now)
        {
            return BookingErrors.StartsInPast;
        }

        if (start > now.AddYears(MaximumYearsAhead))
        {
            return BookingErrors.TooFarAhead;
        }

        return new BookingSlot(start.ToUniversalTime(), end.ToUniversalTime());
    }

    public bool Overlaps(BookingSlot other) => Start < other.End && other.Start < End;

    private static bool IsWithinOpeningHours(DateTimeOffset localStart, DateTimeOffset localEnd) =>
        localStart.Date == localEnd.Date
        && TimeOnly.FromTimeSpan(localStart.TimeOfDay) >= OpeningTime
        && TimeOnly.FromTimeSpan(localEnd.TimeOfDay) <= ClosingTime;

    private static bool IsOnTimeGrid(DateTimeOffset localTime) =>
        localTime.TimeOfDay.Ticks % TimeStep.Ticks == 0;
}
