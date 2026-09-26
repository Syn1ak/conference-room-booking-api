using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// How much confirmed bookings fill each time band (Morning 06:00–09:00, Standard 09:00–12:00 and 14:00–18:00,
/// Peak 12:00–14:00, Evening 18:00–23:00), over the whole period and on each weekday.
/// </summary>
/// <param name="Period">The days the report covers.</param>
/// <param name="Bands">Each band over the whole period.</param>
/// <param name="Weekdays">Each weekday, Monday first, with its bands.</param>
public sealed record DemandReportResponse(
    ReportPeriodResponse Period, IReadOnlyList<BandDemandResponse> Bands, IReadOnlyList<WeekdayDemandResponse> Weekdays)
{
    public static DemandReportResponse From(DemandReport report) => new(
        ReportPeriodResponse.Of(report.Period),
        [.. report.Bands.Select(BandDemandResponse.From)],
        [
            .. report.Weekdays.Select(weekday => new WeekdayDemandResponse(
                weekday.Weekday, weekday.DayCount, [.. weekday.Bands.Select(BandDemandResponse.From)])),
        ]);
}

/// <summary>
/// One weekday of the period.
/// </summary>
/// <param name="Weekday">The weekday, for example Monday.</param>
/// <param name="DayCount">How many days of the period fall on this weekday.</param>
/// <param name="Bands">Each band on this weekday.</param>
public sealed record WeekdayDemandResponse(DayOfWeek Weekday, int DayCount, IReadOnlyList<BandDemandResponse> Bands);

/// <summary>
/// How much of one time band confirmed bookings fill.
/// </summary>
/// <param name="Band">Morning, Standard, Peak, or Evening.</param>
/// <param name="BookedHours">The hours of confirmed bookings that fall into the band.</param>
/// <param name="AvailableHours">The band's hours per day × the number of rooms × the number of days.</param>
/// <param name="OccupancyRate">Booked hours as a fraction from 0 to 1 of available hours.</param>
public sealed record BandDemandResponse(
    TimeBandKind Band, decimal BookedHours, decimal AvailableHours, decimal OccupancyRate)
{
    public static BandDemandResponse From(BandDemand demand) =>
        new(demand.Band, demand.BookedHours, demand.AvailableHours, demand.OccupancyRate);
}
