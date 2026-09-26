using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Application.Rooms;
using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// Reports for admins, each built from the bookings that start within one period.
/// </summary>
public sealed class ReportService(
    IReportQueries queries,
    IRoomRepository rooms,
    VenueTimeZone venueTimeZone,
    TimeProvider timeProvider)
{
    public async Task<Result<RevenueReport>> GetRevenueAsync(
        DateOnly from, DateOnly to, RevenueGrouping groupBy, CancellationToken cancellationToken)
    {
        var period = ReportPeriod.Create(from, to, venueTimeZone.TimeZone);
        if (!period.IsSuccess)
        {
            return period.Error;
        }

        var bookings = await queries.ListBookingsAsync(period.Value, cancellationToken);
        var allRooms = await rooms.ListAsync(cancellationToken);

        return RevenueReport.Build(
            period.Value, groupBy, bookings, allRooms, timeProvider.GetUtcNow(), venueTimeZone.TimeZone);
    }
}
