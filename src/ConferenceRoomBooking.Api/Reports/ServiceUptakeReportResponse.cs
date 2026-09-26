using ConferenceRoomBooking.Application.Reports;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// Which catalog services confirmed bookings in the period include, and what they bring in.
/// </summary>
/// <param name="Period">The days the report covers.</param>
/// <param name="BookingCount">How many confirmed bookings the period has, with or without services.</param>
/// <param name="Services">Every catalog service, ordered by name, including services nobody booked.</param>
public sealed record ServiceUptakeReportResponse(
    ReportPeriodResponse Period, int BookingCount, IReadOnlyList<ServiceUptakeResponse> Services)
{
    public static ServiceUptakeReportResponse From(ServiceUptakeReport report) => new(
        ReportPeriodResponse.Of(report.Period),
        report.BookingCount,
        [
            .. report.Services.Select(service => new ServiceUptakeResponse(
                service.ServiceId, service.ServiceName, service.BookingCount, service.AttachRate, service.Revenue)),
        ]);
}

/// <summary>
/// How often one service was booked and what it brought in.
/// </summary>
/// <param name="ServiceId">The service's id.</param>
/// <param name="ServiceName">The service's current name.</param>
/// <param name="BookingCount">How many confirmed bookings include the service.</param>
/// <param name="AttachRate">Bookings with the service as a fraction from 0 to 1 of all confirmed bookings.</param>
/// <param name="Revenue">What those bookings paid for the service in UAH, at the prices saved with them.</param>
public sealed record ServiceUptakeResponse(
    Guid ServiceId, string ServiceName, int BookingCount, decimal AttachRate, decimal Revenue);
