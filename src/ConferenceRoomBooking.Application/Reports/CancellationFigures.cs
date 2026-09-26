using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// The bookings that were cancelled, out of all bookings made for the same time.
/// </summary>
/// <param name="Count">How many bookings were cancelled.</param>
/// <param name="Rate">Cancelled bookings as a fraction of confirmed and cancelled ones together.</param>
/// <param name="LostRevenue">What the cancelled bookings would have paid in UAH.</param>
public sealed record CancellationFigures(int Count, decimal Rate, decimal LostRevenue)
{
    public static CancellationFigures Of(IReadOnlyCollection<ReportBooking> bookings)
    {
        var cancelled = bookings.Where(booking => booking.Status == BookingStatus.Cancelled).ToList();

        return new CancellationFigures(
            cancelled.Count,
            Rates.Fraction(cancelled.Count, bookings.Count),
            cancelled.Sum(booking => booking.TotalPrice));
    }
}
