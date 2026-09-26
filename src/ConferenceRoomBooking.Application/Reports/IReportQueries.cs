namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// Read-only queries for reports. Nothing they return is tracked or saved.
/// </summary>
public interface IReportQueries
{
    /// <summary>
    /// The bookings that start within <paramref name="period"/>, confirmed and cancelled, ordered by start.
    /// </summary>
    Task<IReadOnlyList<ReportBooking>> ListBookingsAsync(ReportPeriod period, CancellationToken cancellationToken);
}
