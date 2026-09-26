using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// How much confirmed bookings fill each time band, overall and on each weekday, which shows whether the band
/// discounts and surcharges match demand.
/// </summary>
/// <param name="Bands">Each band over the whole period, in the order the bands start.</param>
/// <param name="Weekdays">Each weekday, Monday first, with its bands.</param>
public sealed record DemandReport(
    ReportPeriod Period, IReadOnlyList<BandDemand> Bands, IReadOnlyList<WeekdayDemand> Weekdays)
{
    private static readonly IReadOnlyList<DayOfWeek> WeekdaysFromMonday =
    [
        DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday,
        DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday,
    ];

    /// <summary>
    /// How many hours of each day each band covers, in the order the bands start. A band split into several spans,
    /// like Standard around Peak, counts as one.
    /// </summary>
    public static readonly IReadOnlyList<(TimeBandKind Band, decimal Hours)> HoursPerDay =
    [
        .. PricingSchedule.Bands
            .GroupBy(band => band.Kind)
            .Select(spans => (spans.Key, spans.Sum(band => (decimal)(band.End - band.Start).Ticks / TimeSpan.TicksPerHour))),
    ];

    /// <summary>
    /// Builds the report from the <paramref name="bookings"/> that start within <paramref name="period"/>, for
    /// <paramref name="roomCount"/> rooms, with the bands applied in <paramref name="venueTimeZone"/>.
    /// </summary>
    public static DemandReport Build(
        ReportPeriod period, IReadOnlyList<ReportBooking> bookings, int roomCount, TimeZoneInfo venueTimeZone)
    {
        var bookedHours = bookings
            .Where(booking => booking.Status == BookingStatus.Confirmed)
            .SelectMany(booking => PricingSchedule.Split(booking.Slot, venueTimeZone)
                .Select(segment => (Weekday: booking.DayIn(venueTimeZone).DayOfWeek, segment.Band.Kind, segment.Hours)))
            .ToLookup(part => (part.Weekday, part.Kind), part => part.Hours);
        var dayCounts = period.Days.CountBy(day => day.DayOfWeek).ToDictionary();

        return new DemandReport(
            period,
            [
                .. HoursPerDay.Select(band => BandDemand.Of(
                    band.Band,
                    WeekdaysFromMonday.Sum(weekday => bookedHours[(weekday, band.Band)].Sum()),
                    band.Hours * roomCount * period.DayCount)),
            ],
            [
                .. WeekdaysFromMonday.Select(weekday =>
                {
                    var dayCount = dayCounts.GetValueOrDefault(weekday);
                    return new WeekdayDemand(
                        weekday,
                        dayCount,
                        [
                            .. HoursPerDay.Select(band => BandDemand.Of(
                                band.Band,
                                bookedHours[(weekday, band.Band)].Sum(),
                                band.Hours * roomCount * dayCount)),
                        ]);
                }),
            ]);
    }
}

/// <summary>
/// One weekday of the period, with how often it occurs.
/// </summary>
/// <param name="DayCount">How many days of the period fall on this weekday.</param>
/// <param name="Bands">Each band on this weekday, in the order the bands start.</param>
public sealed record WeekdayDemand(DayOfWeek Weekday, int DayCount, IReadOnlyList<BandDemand> Bands);

/// <summary>
/// How much of one time band confirmed bookings fill.
/// </summary>
/// <param name="BookedHours">The hours of confirmed bookings that fall into the band.</param>
/// <param name="AvailableHours">The band's hours per day × the number of rooms × the number of days.</param>
/// <param name="OccupancyRate">Booked hours as a fraction of available hours.</param>
public sealed record BandDemand(TimeBandKind Band, decimal BookedHours, decimal AvailableHours, decimal OccupancyRate)
{
    public static BandDemand Of(TimeBandKind band, decimal bookedHours, decimal availableHours) =>
        new(band, bookedHours, availableHours, Rates.Fraction(bookedHours, availableHours));
}
