using ConferenceRoomBooking.Application.Reports;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// The days a report covers, in venue time, with both ends included.
/// </summary>
/// <param name="From">The first day.</param>
/// <param name="To">The last day.</param>
/// <param name="DayCount">How many days the period has.</param>
public sealed record ReportPeriodResponse(DateOnly From, DateOnly To, int DayCount)
{
    public static ReportPeriodResponse Of(ReportPeriod period) => new(period.From, period.To, period.DayCount);
}
