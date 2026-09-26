using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using static ConferenceRoomBooking.UnitTests.Application.Reports.ReportTestData;

namespace ConferenceRoomBooking.UnitTests.Application.Reports;

public sealed class RevenueReportTests
{
    private static readonly DateOnly September2 = new(2026, 9, 2);
    private static readonly DateOnly September3 = new(2026, 9, 3);
    private static readonly DateOnly September4 = new(2026, 9, 4);

    private readonly Room _roomA = Room.Create("Room A", 50, 2000m).Value;
    private readonly Room _roomB = Room.Create("Room B", 100, 3500m).Value;

    [Fact]
    public void Build_AddsUpRentalAndServices_OfConfirmedBookings()
    {
        var report = Build(
            Period(September2, September2),
            [
                Booking(_roomA.Id, September2, 10, 12, rental: 4000m, total: 4500m),
                Booking(_roomB.Id, September2, 14, 15, rental: 3500m, total: 3500m),
            ]);

        Assert.Equal(new RevenueFigures(2, 7500m, 500m, 8000m), report.Confirmed);
    }

    [Fact]
    public void Build_CountsCancelledBookingsOnlyAsCancellations()
    {
        var report = Build(
            Period(September2, September2),
            [
                Booking(_roomA.Id, September2, 10, 12, rental: 4000m, total: 4500m),
                Booking(_roomA.Id, September2, 12, 13, rental: 2300m, total: 2600m, status: BookingStatus.Cancelled),
            ]);

        Assert.Equal(new RevenueFigures(1, 4000m, 500m, 4500m), report.Confirmed);
        Assert.Equal(new CancellationFigures(1, 0.5m, 2600m), report.Cancellations);
    }

    [Fact]
    public void Build_CountsABookingAsEarnedOnceItsSlotHasEnded()
    {
        var ended = Booking(_roomA.Id, September2, 10, 12, rental: 4000m, total: 4000m);
        var ongoing = Booking(_roomB.Id, September2, 11, 13, rental: 7525m, total: 7525m);
        var later = Booking(_roomA.Id, September3, 10, 11, rental: 2000m, total: 2000m);

        var report = Build(Period(September2, September3), [ended, ongoing, later], now: At(September2, 12));

        Assert.Equal(new RevenueFigures(1, 4000m, 0m, 4000m), report.Earned);
        Assert.Equal(new RevenueFigures(2, 9525m, 0m, 9525m), report.Upcoming);
        Assert.Equal(new RevenueFigures(3, 13525m, 0m, 13525m), report.Confirmed);
    }

    [Fact]
    public void Build_ListsEveryRoom_WithZerosForRoomsWithoutBookings()
    {
        var report = Build(
            Period(September2, September2),
            [
                Booking(_roomA.Id, September2, 10, 12, rental: 4000m, total: 4500m),
                Booking(_roomA.Id, September2, 14, 15, rental: 2000m, total: 2000m, status: BookingStatus.Cancelled),
            ]);

        Assert.Equal(
            [
                new RoomRevenue(
                    _roomA.Id, "Room A", new RevenueFigures(1, 4000m, 500m, 4500m), new CancellationFigures(1, 0.5m, 2000m)),
                new RoomRevenue(
                    _roomB.Id, "Room B", new RevenueFigures(0, 0m, 0m, 0m), new CancellationFigures(0, 0m, 0m)),
            ],
            report.Rooms);
    }

    [Fact]
    public void Build_ByDay_HasAnEntryForEveryDayOfThePeriod()
    {
        var report = Build(
            Period(September2, September4),
            [Booking(_roomA.Id, September3, 10, 12, rental: 4000m, total: 4000m)],
            RevenueGrouping.Day);

        Assert.Equal(
            [
                (September2, September2, 0m),
                (September3, September3, 4000m),
                (September4, September4, 0m),
            ],
            report.Periods.Select(period => (period.From, period.To, period.Revenue.Total)));
    }

    [Fact]
    public void Build_ByMonth_CountsOnlyTheDaysOfEachMonthInsideThePeriod()
    {
        var report = Build(
            Period(new DateOnly(2026, 9, 15), new DateOnly(2026, 11, 10)),
            [
                Booking(_roomA.Id, new DateOnly(2026, 9, 20), 10, 11, rental: 2000m, total: 2000m),
                Booking(_roomA.Id, new DateOnly(2026, 9, 21), 10, 11, rental: 2000m, total: 2000m),
                Booking(_roomB.Id, new DateOnly(2026, 11, 5), 10, 11, rental: 3500m, total: 3500m),
            ],
            RevenueGrouping.Month);

        Assert.Equal(
            [
                (new DateOnly(2026, 9, 15), new DateOnly(2026, 9, 30), 2, 4000m),
                (new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31), 0, 0m),
                (new DateOnly(2026, 11, 1), new DateOnly(2026, 11, 10), 1, 3500m),
            ],
            report.Periods.Select(period => (period.From, period.To, period.Revenue.BookingCount, period.Revenue.Total)));
    }

    [Fact]
    public void Build_ByDay_PutsABookingOnItsDayInVenueTime()
    {
        // 22:00 on 2 September in New York is already 3 September in UTC.
        var newYork = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");
        var start = new DateTimeOffset(2026, 9, 2, 22, 0, 0, TimeSpan.FromHours(-4));
        var slot = BookingSlot.Create(start, start.AddHours(1), SlotCreationTime, newYork).Value;
        var booking = new ReportBooking(_roomA.Id, slot, BookingStatus.Confirmed, 1, 1600m, 1600m, []);

        var report = RevenueReport.Build(
            ReportPeriod.Create(September2, September3, newYork).Value,
            RevenueGrouping.Day,
            [booking],
            [_roomA],
            SlotCreationTime,
            newYork);

        Assert.Equal([1600m, 0m], report.Periods.Select(period => period.Revenue.Total));
    }

    [Fact]
    public void Build_WithoutBookings_ReportsZeros()
    {
        var report = Build(Period(September2, September2), []);

        Assert.Equal(new RevenueFigures(0, 0m, 0m, 0m), report.Confirmed);
        Assert.Equal(new CancellationFigures(0, 0m, 0m), report.Cancellations);
    }

    [Fact]
    public void Build_RoundsTheCancellationRateToFourDecimalPlaces()
    {
        var report = Build(
            Period(September2, September2),
            [
                Booking(_roomA.Id, September2, 10, 11),
                Booking(_roomA.Id, September2, 11, 12),
                Booking(_roomA.Id, September2, 12, 13, status: BookingStatus.Cancelled),
            ]);

        Assert.Equal(0.3333m, report.Cancellations.Rate);
    }

    private RevenueReport Build(
        ReportPeriod period,
        IReadOnlyList<ReportBooking> bookings,
        RevenueGrouping groupBy = RevenueGrouping.Month,
        DateTimeOffset? now = null) =>
        RevenueReport.Build(period, groupBy, bookings, [_roomA, _roomB], now ?? SlotCreationTime, Kyiv);
}
