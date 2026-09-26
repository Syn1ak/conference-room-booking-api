using ConferenceRoomBooking.Application.Reports;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Reports;

/// <summary>
/// <see cref="IReportQueries"/> implemented with EF Core.
/// </summary>
public sealed class ReportQueries(ApplicationDbContext dbContext) : IReportQueries
{
    public async Task<IReadOnlyList<ReportBooking>> ListBookingsAsync(
        ReportPeriod period, CancellationToken cancellationToken) =>
        await dbContext.Bookings
            .AsNoTracking()
            .Where(booking => booking.Slot.Start >= period.Start && booking.Slot.Start < period.End)
            .OrderBy(booking => booking.Slot.Start)
            .ThenBy(booking => booking.Id)
            .Select(booking => new ReportBooking(
                booking.RoomId,
                booking.Slot,
                booking.Status,
                booking.AttendeeCount,
                booking.RentalPrice,
                booking.TotalPrice,
                booking.BookedServices
                    .Select(service => new ReportBookedService(service.ServiceId, service.Price))
                    .ToList()))
            .ToListAsync(cancellationToken);
}
