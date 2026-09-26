using ConferenceRoomBooking.Application.Reports;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// Revenue from the confirmed bookings that start within the period, with the saved prices, in UAH.
/// </summary>
/// <param name="Period">The days the report covers.</param>
/// <param name="GroupBy">Whether <paramref name="Periods"/> has an entry per day or per month.</param>
/// <param name="Confirmed">All confirmed bookings.</param>
/// <param name="Earned">Confirmed bookings whose slot has ended.</param>
/// <param name="Upcoming">Confirmed bookings whose slot hasn't ended yet: on the books, but not yet held.</param>
/// <param name="Cancellations">The bookings in the period that were cancelled.</param>
/// <param name="Rooms">Every room, ordered by name, including rooms without bookings.</param>
/// <param name="Periods">Every day or month of the period in order, including those without bookings.</param>
public sealed record RevenueReportResponse(
    ReportPeriodResponse Period,
    RevenueGrouping GroupBy,
    RevenueFiguresResponse Confirmed,
    RevenueFiguresResponse Earned,
    RevenueFiguresResponse Upcoming,
    CancellationFiguresResponse Cancellations,
    IReadOnlyList<RoomRevenueResponse> Rooms,
    IReadOnlyList<PeriodRevenueResponse> Periods)
{
    public static RevenueReportResponse From(RevenueReport report) => new(
        ReportPeriodResponse.Of(report.Period),
        report.GroupBy,
        RevenueFiguresResponse.From(report.Confirmed),
        RevenueFiguresResponse.From(report.Earned),
        RevenueFiguresResponse.From(report.Upcoming),
        CancellationFiguresResponse.From(report.Cancellations),
        [
            .. report.Rooms.Select(room => new RoomRevenueResponse(
                room.RoomId,
                room.RoomName,
                RevenueFiguresResponse.From(room.Revenue),
                CancellationFiguresResponse.From(room.Cancellations))),
        ],
        [
            .. report.Periods.Select(period => new PeriodRevenueResponse(
                period.From, period.To, RevenueFiguresResponse.From(period.Revenue))),
        ]);
}

/// <summary>
/// Revenue from a set of confirmed bookings, in UAH.
/// </summary>
/// <param name="BookingCount">How many bookings there are.</param>
/// <param name="Rental">The room rental, after time-of-day discounts and surcharges.</param>
/// <param name="Services">The chosen services.</param>
/// <param name="Total">The room rental plus the services.</param>
public sealed record RevenueFiguresResponse(int BookingCount, decimal Rental, decimal Services, decimal Total)
{
    public static RevenueFiguresResponse From(RevenueFigures figures) =>
        new(figures.BookingCount, figures.Rental, figures.Services, figures.Total);
}

/// <summary>
/// One room's revenue and cancellations in the period.
/// </summary>
/// <param name="RoomId">The room's id.</param>
/// <param name="RoomName">The room's current name.</param>
/// <param name="Revenue">The room's confirmed bookings.</param>
/// <param name="Cancellations">The room's cancelled bookings.</param>
public sealed record RoomRevenueResponse(
    Guid RoomId, string RoomName, RevenueFiguresResponse Revenue, CancellationFiguresResponse Cancellations);

/// <summary>
/// The revenue of one day or month. A month the period only partly covers counts only its days inside the period.
/// </summary>
/// <param name="From">The first day counted.</param>
/// <param name="To">The last day counted.</param>
/// <param name="Revenue">The confirmed bookings on those days.</param>
public sealed record PeriodRevenueResponse(DateOnly From, DateOnly To, RevenueFiguresResponse Revenue);
