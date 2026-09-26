using ConferenceRoomBooking.Application.Reports;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// The bookings that were cancelled, out of all bookings made for the same time.
/// </summary>
/// <param name="Count">How many bookings were cancelled.</param>
/// <param name="Rate">Cancelled bookings as a fraction from 0 to 1 of confirmed and cancelled ones together.</param>
/// <param name="LostRevenue">What the cancelled bookings would have paid in UAH.</param>
public sealed record CancellationFiguresResponse(int Count, decimal Rate, decimal LostRevenue)
{
    public static CancellationFiguresResponse From(CancellationFigures figures) =>
        new(figures.Count, figures.Rate, figures.LostRevenue);
}
