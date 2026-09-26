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
    public Task<Result<RevenueReport>> GetRevenueAsync(
        DateOnly from, DateOnly to, RevenueGrouping groupBy, CancellationToken cancellationToken) =>
        BuildAsync(
            from,
            to,
            async (period, bookings) => RevenueReport.Build(
                period,
                groupBy,
                bookings,
                await rooms.ListAsync(cancellationToken),
                timeProvider.GetUtcNow(),
                venueTimeZone.TimeZone),
            cancellationToken);

    public Task<Result<OccupancyReport>> GetOccupancyAsync(
        DateOnly from, DateOnly to, CancellationToken cancellationToken) =>
        BuildAsync(
            from,
            to,
            async (period, bookings) => OccupancyReport.Build(period, bookings, await rooms.ListAsync(cancellationToken)),
            cancellationToken);

    public Task<Result<DemandReport>> GetDemandAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken) =>
        BuildAsync(
            from,
            to,
            async (period, bookings) => DemandReport.Build(
                period, bookings, (await rooms.ListAsync(cancellationToken)).Count, venueTimeZone.TimeZone),
            cancellationToken);

    private async Task<Result<TReport>> BuildAsync<TReport>(
        DateOnly from,
        DateOnly to,
        Func<ReportPeriod, IReadOnlyList<ReportBooking>, Task<TReport>> build,
        CancellationToken cancellationToken)
    {
        var period = ReportPeriod.Create(from, to, venueTimeZone.TimeZone);
        if (!period.IsSuccess)
        {
            return period.Error;
        }

        var bookings = await queries.ListBookingsAsync(period.Value, cancellationToken);
        return await build(period.Value, bookings);
    }
}
