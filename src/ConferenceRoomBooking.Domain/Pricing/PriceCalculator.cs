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
        var localStart = TimeZoneInfo.ConvertTime(slot.Start, venueTimeZone);
        var localEnd = TimeZoneInfo.ConvertTime(slot.End, venueTimeZone);

        var rentalLines = new List<RentalLine>();
        foreach (var band in PricingSchedule.Bands)
        {
            var lineStart = Later(localStart, AtTimeOfDay(localStart, band.Start));
            var lineEnd = Earlier(localEnd, AtTimeOfDay(localStart, band.End));
            if (lineStart >= lineEnd)
            {
                continue;
            }

            var hours = (decimal)(lineEnd - lineStart).Ticks / TimeSpan.TicksPerHour;
            var amount = Math.Round(
                hours * hourlyPrice * band.Multiplier, Prices.DecimalPlaces, MidpointRounding.AwayFromZero);
            rentalLines.Add(new RentalLine(band.Kind, lineStart, lineEnd, hours, band.Multiplier, amount));
        }

        return new PriceBreakdown(rentalLines, services);
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
