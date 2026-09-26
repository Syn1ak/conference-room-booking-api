using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Domain.Pricing;

/// <summary>
/// What a booking costs, line by line. The totals are sums of the lines, so the breakdown always adds up.
/// </summary>
public sealed class PriceBreakdown
{
    internal PriceBreakdown(IReadOnlyList<RentalLine> rentalLines, IReadOnlyCollection<BookedService> services)
    {
        RentalLines = rentalLines;
        Services = services;
        RentalPrice = rentalLines.Sum(line => line.Amount);
        TotalPrice = RentalPrice + services.Sum(service => service.Price);
    }

    /// <summary>The room rental, one line per time band the booking touches, in time order.</summary>
    public IReadOnlyList<RentalLine> RentalLines { get; }

    /// <summary>The chosen services, each charged once per booking.</summary>
    public IReadOnlyCollection<BookedService> Services { get; }

    /// <summary>The room rental in UAH, before services.</summary>
    public decimal RentalPrice { get; }

    /// <summary>The room rental plus services in UAH.</summary>
    public decimal TotalPrice { get; }
}
