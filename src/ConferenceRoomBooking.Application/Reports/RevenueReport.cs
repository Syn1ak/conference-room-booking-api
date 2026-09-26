using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// Revenue from the confirmed bookings in a period: in total, per room, and per day or month, with the cancellations
/// that reduced it.
/// </summary>
/// <param name="Confirmed">All confirmed bookings.</param>
/// <param name="Earned">Confirmed bookings whose slot has ended.</param>
/// <param name="Upcoming">Confirmed bookings whose slot hasn't ended yet.</param>
/// <param name="Rooms">Every room, ordered by name, including rooms without bookings.</param>
/// <param name="Periods">Every day or month of the period in order, including those without bookings.</param>
public sealed record RevenueReport(
    ReportPeriod Period,
    RevenueGrouping GroupBy,
    RevenueFigures Confirmed,
    RevenueFigures Earned,
    RevenueFigures Upcoming,
    CancellationFigures Cancellations,
    IReadOnlyList<RoomRevenue> Rooms,
    IReadOnlyList<PeriodRevenue> Periods)
{
    /// <summary>
    /// Builds the report from the <paramref name="bookings"/> that start within <paramref name="period"/> and all
    /// <paramref name="rooms"/>, ordered by name.
    /// </summary>
    public static RevenueReport Build(
        ReportPeriod period,
        RevenueGrouping groupBy,
        IReadOnlyList<ReportBooking> bookings,
        IReadOnlyList<Room> rooms,
        DateTimeOffset now,
        TimeZoneInfo venueTimeZone)
    {
        var confirmed = bookings.Where(booking => booking.Status == BookingStatus.Confirmed).ToList();
        var bookingsByRoom = bookings.ToLookup(booking => booking.RoomId);
        var confirmedByDay = confirmed.ToLookup(booking => booking.DayIn(venueTimeZone));

        return new RevenueReport(
            period,
            groupBy,
            RevenueFigures.Of(confirmed),
            RevenueFigures.Of(confirmed.Where(booking => booking.Slot.End <= now)),
            RevenueFigures.Of(confirmed.Where(booking => booking.Slot.End > now)),
            CancellationFigures.Of(bookings),
            [
                .. rooms.Select(room =>
                {
                    var roomBookings = bookingsByRoom[room.Id].ToList();
                    return new RoomRevenue(
                        room.Id,
                        room.Name,
                        RevenueFigures.Of(roomBookings.Where(booking => booking.Status == BookingStatus.Confirmed)),
                        CancellationFigures.Of(roomBookings));
                }),
            ],
            [
                .. SplitDays(period, groupBy).Select(days => new PeriodRevenue(
                    days[0], days[^1], RevenueFigures.Of(days.SelectMany(day => confirmedByDay[day])))),
            ]);
    }

    private static IEnumerable<IReadOnlyList<DateOnly>> SplitDays(ReportPeriod period, RevenueGrouping groupBy) =>
        groupBy switch
        {
            RevenueGrouping.Day => period.Days.Select(day => (IReadOnlyList<DateOnly>)[day]),
            RevenueGrouping.Month => period.Days.GroupBy(day => (day.Year, day.Month)).Select(month => month.ToList()),
            _ => throw new ArgumentOutOfRangeException(nameof(groupBy), groupBy, "Unsupported grouping."),
        };
}

/// <summary>
/// Revenue from a set of confirmed bookings.
/// </summary>
/// <param name="BookingCount">How many bookings there are.</param>
/// <param name="Rental">The room rental in UAH, after time-of-day discounts and surcharges.</param>
/// <param name="Services">The chosen services in UAH.</param>
/// <param name="Total">The room rental plus the services in UAH.</param>
public sealed record RevenueFigures(int BookingCount, decimal Rental, decimal Services, decimal Total)
{
    public static RevenueFigures Of(IEnumerable<ReportBooking> confirmedBookings)
    {
        var bookings = confirmedBookings.ToList();
        var rental = bookings.Sum(booking => booking.RentalPrice);
        var total = bookings.Sum(booking => booking.TotalPrice);

        return new RevenueFigures(bookings.Count, rental, total - rental, total);
    }
}

/// <summary>
/// One room's revenue and cancellations.
/// </summary>
public sealed record RoomRevenue(Guid RoomId, string RoomName, RevenueFigures Revenue, CancellationFigures Cancellations);

/// <summary>
/// The revenue of the days from <paramref name="From"/> to <paramref name="To"/>, both included.
/// </summary>
public sealed record PeriodRevenue(DateOnly From, DateOnly To, RevenueFigures Revenue);
