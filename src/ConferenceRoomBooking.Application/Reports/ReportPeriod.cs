using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// The days a report covers, as venue-local dates with both ends included. A booking belongs to the day its slot
/// starts on, in venue time.
/// </summary>
public sealed record ReportPeriod
{
    /// <summary>The longest period a report covers, which also bounds how many bookings it loads.</summary>
    public const int MaxDays = 366;

    private ReportPeriod(DateOnly from, DateOnly to, DateTimeOffset start, DateTimeOffset end)
    {
        From = from;
        To = to;
        Start = start;
        End = end;
    }

    /// <summary>The first day, in venue time.</summary>
    public DateOnly From { get; }

    /// <summary>The last day, in venue time.</summary>
    public DateOnly To { get; }

    /// <summary>Where <see cref="From"/> begins, in UTC.</summary>
    public DateTimeOffset Start { get; }

    /// <summary>Where the day after <see cref="To"/> begins, in UTC. Bookings that start here or later are outside.</summary>
    public DateTimeOffset End { get; }

    public int DayCount => To.DayNumber - From.DayNumber + 1;

    public IEnumerable<DateOnly> Days => Enumerable.Range(0, DayCount).Select(From.AddDays);

    public static Result<ReportPeriod> Create(DateOnly from, DateOnly to, TimeZoneInfo venueTimeZone)
    {
        if (to < from)
        {
            return ReportErrors.PeriodEndsBeforeStart;
        }

        if (to.DayNumber - from.DayNumber + 1 > MaxDays)
        {
            return ReportErrors.PeriodTooLong;
        }

        return new ReportPeriod(from, to, StartOfDay(from, venueTimeZone), StartOfDay(to.AddDays(1), venueTimeZone));
    }

    // Bookings lie between 06:00 and 23:00, so any time in the night works as the boundary between days. Midnight's
    // offset is taken as is, which also works in a zone where midnight is skipped or repeated by a daylight-saving change.
    private static DateTimeOffset StartOfDay(DateOnly day, TimeZoneInfo venueTimeZone)
    {
        var localMidnight = day.ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(localMidnight, venueTimeZone.GetUtcOffset(localMidnight)).ToUniversalTime();
    }
}
