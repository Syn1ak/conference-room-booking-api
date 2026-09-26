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
}
