using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Domain.Pricing;

/// <summary>
/// The room rental rates by time of day, as a timeline without overlaps. The peak surcharge replaces the standard rate
/// from 12:00 to 14:00. The bands cover exactly the opening hours in <see cref="BookingSlot"/>.
/// </summary>
public static class PricingSchedule
{
    public static readonly IReadOnlyList<TimeBand> Bands =
    [
        new(TimeBandKind.Morning, new TimeOnly(6, 0), new TimeOnly(9, 0), 0.90m),
        new(TimeBandKind.Standard, new TimeOnly(9, 0), new TimeOnly(12, 0), 1.00m),
        new(TimeBandKind.Peak, new TimeOnly(12, 0), new TimeOnly(14, 0), 1.15m),
        new(TimeBandKind.Standard, new TimeOnly(14, 0), new TimeOnly(18, 0), 1.00m),
        new(TimeBandKind.Evening, new TimeOnly(18, 0), new TimeOnly(23, 0), 0.80m),
    ];

    /// <summary>
    /// Splits <paramref name="slot"/> into one segment per band it touches, in time order, with the bands applied in
    /// <paramref name="venueTimeZone"/>, whatever offset the slot was given in.
    /// </summary>
    public static IReadOnlyList<TimeBandSegment> Split(BookingSlot slot, TimeZoneInfo venueTimeZone)
    {
        var localStart = TimeZoneInfo.ConvertTime(slot.Start, venueTimeZone);
        var localEnd = TimeZoneInfo.ConvertTime(slot.End, venueTimeZone);

        var segments = new List<TimeBandSegment>();
        foreach (var band in Bands)
        {
            var segmentStart = Later(localStart, AtTimeOfDay(localStart, band.Start));
            var segmentEnd = Earlier(localEnd, AtTimeOfDay(localStart, band.End));
            if (segmentStart >= segmentEnd)
            {
                continue;
            }

            var hours = (decimal)(segmentEnd - segmentStart).Ticks / TimeSpan.TicksPerHour;
            segments.Add(new TimeBandSegment(band, segmentStart, segmentEnd, hours));
        }

        return segments;
    }

    // A slot lies within opening hours on one day, and daylight-saving changes happen outside them,
    // so every band boundary that matters shares the slot's offset.
    private static DateTimeOffset AtTimeOfDay(DateTimeOffset localDay, TimeOnly time) =>
        new(localDay.Date.Add(time.ToTimeSpan()), localDay.Offset);

    private static DateTimeOffset Later(DateTimeOffset first, DateTimeOffset second) =>
        first > second ? first : second;

    private static DateTimeOffset Earlier(DateTimeOffset first, DateTimeOffset second) =>
        first < second ? first : second;
}
