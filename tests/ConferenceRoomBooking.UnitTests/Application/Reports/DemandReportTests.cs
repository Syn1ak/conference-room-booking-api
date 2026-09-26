using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;
using static ConferenceRoomBooking.UnitTests.Application.Reports.ReportTestData;

namespace ConferenceRoomBooking.UnitTests.Application.Reports;

public sealed class DemandReportTests
{
    private const int RoomCount = 2;

    private static readonly DateOnly Wednesday2 = new(2026, 9, 2);
    private static readonly DateOnly Tuesday8 = new(2026, 9, 8);
    private static readonly DateOnly Friday11 = new(2026, 9, 11);

    private static readonly Guid RoomId = Guid.NewGuid();

    [Fact]
    public void HoursPerDay_CountStandardOnBothSidesOfPeak_AndAddUpToTheOpeningHours()
    {
        Assert.Equal(
            [(TimeBandKind.Morning, 3m), (TimeBandKind.Standard, 7m), (TimeBandKind.Peak, 2m), (TimeBandKind.Evening, 5m)],
            DemandReport.HoursPerDay);
        Assert.Equal(OccupancyReport.OpenHoursPerDay, DemandReport.HoursPerDay.Sum(band => band.Hours));
    }

    [Fact]
    public void Build_SplitsABookingAcrossTheBandsOnItsWeekday()
    {
        var report = Build(Period(Wednesday2, Wednesday2), [Booking(RoomId, Wednesday2, 11, 15)]);

        var wednesday = report.Weekdays.Single(weekday => weekday.Weekday == DayOfWeek.Wednesday);
        Assert.Equal(
            [
                (TimeBandKind.Morning, 0m, 6m),
                (TimeBandKind.Standard, 2m, 14m),
                (TimeBandKind.Peak, 2m, 4m),
                (TimeBandKind.Evening, 0m, 10m),
            ],
            wednesday.Bands.Select(band => (band.Band, band.BookedHours, band.AvailableHours)));
        Assert.Equal([0.1429m, 0.5m], wednesday.Bands.Skip(1).Take(2).Select(band => band.OccupancyRate));
    }

    [Fact]
    public void Build_ListsEveryWeekdayMondayFirst_WithHowOftenItOccurs()
    {
        // Wednesday 2 to Friday 11 September: Wednesday, Thursday, and Friday occur twice.
        var report = Build(Period(Wednesday2, Friday11), []);

        Assert.Equal(
            [
                (DayOfWeek.Monday, 1), (DayOfWeek.Tuesday, 1), (DayOfWeek.Wednesday, 2), (DayOfWeek.Thursday, 2),
                (DayOfWeek.Friday, 2), (DayOfWeek.Saturday, 1), (DayOfWeek.Sunday, 1),
            ],
            report.Weekdays.Select(weekday => (weekday.Weekday, weekday.DayCount)));
        var friday = report.Weekdays.Single(weekday => weekday.Weekday == DayOfWeek.Friday);
        Assert.Equal(2 * RoomCount * 5m, friday.Bands.Single(band => band.Band == TimeBandKind.Evening).AvailableHours);
    }

    [Fact]
    public void Build_WithoutBookings_ReportsZeros()
    {
        var report = Build(Period(Wednesday2, Wednesday2), []);

        Assert.All(
            report.Weekdays.SelectMany(weekday => weekday.Bands).Concat(report.Bands),
            band => Assert.Equal((0m, 0m), (band.BookedHours, band.OccupancyRate)));
        Assert.All(
            report.Weekdays.Where(weekday => weekday.Weekday != DayOfWeek.Wednesday).SelectMany(weekday => weekday.Bands),
            band => Assert.Equal(0m, band.AvailableHours));
    }

    [Fact]
    public void Build_IgnoresCancelledBookings()
    {
        var report = Build(
            Period(Wednesday2, Wednesday2),
            [Booking(RoomId, Wednesday2, 19, 21, status: BookingStatus.Cancelled)]);

        Assert.Equal(0m, report.Bands.Single(band => band.Band == TimeBandKind.Evening).BookedHours);
    }

    [Fact]
    public void Build_AddsUpEachBandOverAllWeekdays()
    {
        var report = Build(
            Period(Wednesday2, Tuesday8),
            [
                Booking(RoomId, Wednesday2, 18, 20),
                Booking(RoomId, Tuesday8, 21, 23),
                Booking(RoomId, Tuesday8, 8, 10),
            ]);

        Assert.Equal(
            [
                (TimeBandKind.Morning, 1m, 42m, 0.0238m),
                (TimeBandKind.Standard, 1m, 98m, 0.0102m),
                (TimeBandKind.Peak, 0m, 28m, 0m),
                (TimeBandKind.Evening, 4m, 70m, 0.0571m),
            ],
            report.Bands.Select(band => (band.Band, band.BookedHours, band.AvailableHours, band.OccupancyRate)));
    }

    private static DemandReport Build(ReportPeriod period, IReadOnlyList<ReportBooking> bookings) =>
        DemandReport.Build(period, bookings, RoomCount, Kyiv);
}
