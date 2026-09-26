using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Pricing;

/// <summary>
/// Calculates what a booking costs: the room rental pro rata across the time bands in
/// <see cref="PricingSchedule"/>, plus a flat fee for each chosen service.
/// </summary>
public static class PriceCalculator
{
    /// <summary>
    /// Prices <paramref name="slot"/> at <paramref name="hourlyPrice"/>, with the time bands applied in
    /// <paramref name="venueTimeZone"/>, whatever offset the slot was given in.
    /// </summary>
    public static PriceBreakdown Calculate(
        BookingSlot slot, decimal hourlyPrice, IReadOnlyCollection<BookedService> services, TimeZoneInfo venueTimeZone)
    {
        var rentalLines = PricingSchedule.Split(slot, venueTimeZone)
            .Select(segment => new RentalLine(
                segment.Band.Kind,
                segment.Start,
                segment.End,
                segment.Hours,
                segment.Band.Multiplier,
                Math.Round(
                    segment.Hours * hourlyPrice * segment.Band.Multiplier,
                    Prices.DecimalPlaces,
                    MidpointRounding.AwayFromZero)))
            .ToList();

        return new PriceBreakdown(rentalLines, services);
    }
}
