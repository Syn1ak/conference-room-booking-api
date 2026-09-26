using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// Which catalog services confirmed bookings in a period include, and what they bring in.
/// </summary>
/// <param name="BookingCount">How many confirmed bookings the period has, with or without services.</param>
/// <param name="Services">Every catalog service, ordered by name, including services nobody booked.</param>
public sealed record ServiceUptakeReport(ReportPeriod Period, int BookingCount, IReadOnlyList<ServiceUptake> Services)
{
    /// <summary>
    /// Builds the report from the <paramref name="bookings"/> that start within <paramref name="period"/> and all
    /// catalog <paramref name="services"/>, ordered by name.
    /// </summary>
    public static ServiceUptakeReport Build(
        ReportPeriod period, IReadOnlyList<ReportBooking> bookings, IReadOnlyList<Service> services)
    {
        var confirmed = bookings.Where(booking => booking.Status == BookingStatus.Confirmed).ToList();
        var pricesByService = confirmed
            .SelectMany(booking => booking.Services)
            .ToLookup(service => service.ServiceId, service => service.Price);

        return new ServiceUptakeReport(
            period,
            confirmed.Count,
            [
                .. services.Select(service =>
                {
                    var prices = pricesByService[service.Id].ToList();
                    return new ServiceUptake(
                        service.Id, service.Name, prices.Count, Rates.Fraction(prices.Count, confirmed.Count), prices.Sum());
                }),
            ]);
    }
}

/// <summary>
/// How often one service was booked and what it brought in.
/// </summary>
/// <param name="ServiceName">The service's current name.</param>
/// <param name="BookingCount">How many confirmed bookings include the service.</param>
/// <param name="AttachRate">Bookings with the service as a fraction of all confirmed bookings.</param>
/// <param name="Revenue">What those bookings paid for the service in UAH, at the saved prices.</param>
public sealed record ServiceUptake(
    Guid ServiceId, string ServiceName, int BookingCount, decimal AttachRate, decimal Revenue);
