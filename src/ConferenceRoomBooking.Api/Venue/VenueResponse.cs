using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.Api.Venue;

/// <summary>
/// The rules every booking follows. Times of day are in the venue's time zone.
/// </summary>
/// <param name="TimeZone">IANA id of the venue's time zone, for example "Europe/Kyiv".</param>
/// <param name="OpeningTime">The earliest a booking can start.</param>
/// <param name="ClosingTime">The latest a booking can end, on the same day it starts.</param>
/// <param name="TimeStepMinutes">Bookings start and end on a step of this many minutes, counted from midnight.</param>
/// <param name="MinimumDurationMinutes">The shortest booking, in minutes.</param>
/// <param name="MaximumYearsAhead">How many years ahead a booking can start at most.</param>
/// <param name="Bands">The room rental rates by time of day, in time order, covering exactly the opening hours.</param>
public sealed record VenueResponse(
    string TimeZone,
    TimeOnly OpeningTime,
    TimeOnly ClosingTime,
    int TimeStepMinutes,
    int MinimumDurationMinutes,
    int MaximumYearsAhead,
    IReadOnlyList<TimeBandResponse> Bands)
{
    public static VenueResponse Create(string timeZone) => new(
        timeZone,
        BookingSlot.OpeningTime,
        BookingSlot.ClosingTime,
        (int)BookingSlot.TimeStep.TotalMinutes,
        (int)BookingSlot.MinimumDuration.TotalMinutes,
        BookingSlot.MaximumYearsAhead,
        [.. PricingSchedule.Bands.Select(TimeBandResponse.From)]);
}

/// <summary>
/// A span of the day with one rental rate: the room's hourly price times the multiplier.
/// </summary>
/// <param name="Band">Morning, Standard, Peak, or Evening.</param>
/// <param name="Start">Where the band starts, included.</param>
/// <param name="End">Where the band ends, excluded.</param>
/// <param name="Multiplier">What the band multiplies the room's hourly price by, for example 1.15 at peak hours.</param>
public sealed record TimeBandResponse(TimeBandKind Band, TimeOnly Start, TimeOnly End, decimal Multiplier)
{
    public static TimeBandResponse From(TimeBand band) => new(band.Kind, band.Start, band.End, band.Multiplier);
}
