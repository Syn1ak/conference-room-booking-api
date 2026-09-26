using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using static ConferenceRoomBooking.UnitTests.Application.Reports.ReportTestData;

namespace ConferenceRoomBooking.UnitTests.Application.Reports;

public sealed class OccupancyReportTests
{
    private static readonly DateOnly September2 = new(2026, 9, 2);
    private static readonly DateOnly September4 = new(2026, 9, 4);

    private readonly Room _roomA = Room.Create("Room A", 50, 2000m).Value;
    private readonly Room _roomB = Room.Create("Room B", 100, 3500m).Value;

    [Fact]
    public void OpenHoursPerDay_AreTheOpeningHours()
    {
        Assert.Equal(17m, OccupancyReport.OpenHoursPerDay);
    }

    [Fact]
    public void Build_ComparesBookedHoursWithTheRoomsOpenHours()
    {
        var report = Build(
            Period(September2, September2),
            [Booking(_roomA.Id, September2, 10, 12), Booking(_roomA.Id, September2, 14, 15)]);

        var roomA = report.Rooms[0].Occupancy;
        Assert.Equal((2, 3m, 17m, 0.1765m), (roomA.BookingCount, roomA.BookedHours, roomA.OpenHours, roomA.OccupancyRate));
    }

    [Fact]
    public void Build_CountsFractionalHours()
    {
        var booking = new ReportBooking(
            _roomA.Id, Slot(September2, 10, 11, endMinute: 45), BookingStatus.Confirmed, 1, 0m, 0m, []);

        var report = Build(Period(September2, September2), [booking]);

        Assert.Equal(1.75m, report.Rooms[0].Occupancy.BookedHours);
    }

    [Fact]
    public void Build_Overall_AddsUpTheHoursOfAllRoomsOverAllDays()
    {
        var report = Build(
            Period(September2, September4),
            [Booking(_roomA.Id, September2, 6, 23), Booking(_roomB.Id, September4, 6, 23)]);

        var overall = report.Overall;
        Assert.Equal((34m, 102m, 0.3333m), (overall.BookedHours, overall.OpenHours, overall.OccupancyRate));
        Assert.All(report.Rooms, room => Assert.Equal(51m, room.Occupancy.OpenHours));
    }

    [Fact]
    public void Build_MeasuresHowFullTheRoomsAre_AgainstEachRoomsCapacity()
    {
        var report = Build(
            Period(September2, September2),
            [
                Booking(_roomA.Id, September2, 10, 11, attendeeCount: 10),
                Booking(_roomA.Id, September2, 11, 12, attendeeCount: 40),
                Booking(_roomB.Id, September2, 10, 11, attendeeCount: 51),
            ]);

        Assert.Equal((25m, 0.5m), (report.Rooms[0].Occupancy.AverageAttendees, report.Rooms[0].Occupancy.FillRate));
        Assert.Equal((51m, 0.51m), (report.Rooms[1].Occupancy.AverageAttendees, report.Rooms[1].Occupancy.FillRate));
        // (0.2 + 0.8 + 0.51) / 3 and (10 + 40 + 51) / 3.
        Assert.Equal((33.67m, 0.5033m), (report.Overall.AverageAttendees, report.Overall.FillRate));
    }

    [Fact]
    public void Build_CountsCancelledBookingsOnlyAsCancellations()
    {
        var report = Build(
            Period(September2, September2),
            [
                Booking(_roomA.Id, September2, 10, 12, attendeeCount: 20),
                Booking(_roomA.Id, September2, 14, 16, total: 4000m, attendeeCount: 50, status: BookingStatus.Cancelled),
            ]);

        var roomA = report.Rooms[0].Occupancy;
        Assert.Equal((1, 2m, 20m, 0.4m), (roomA.BookingCount, roomA.BookedHours, roomA.AverageAttendees, roomA.FillRate));
        Assert.Equal(new CancellationFigures(1, 0.5m, 4000m), roomA.Cancellations);
    }

    [Fact]
    public void Build_ListsEveryRoom_WithZerosForRoomsWithoutBookings()
    {
        var report = Build(Period(September2, September2), [Booking(_roomA.Id, September2, 10, 12)]);

        Assert.Equal(
            [(_roomA.Id, "Room A", 50), (_roomB.Id, "Room B", 100)],
            report.Rooms.Select(room => (room.RoomId, room.RoomName, room.Capacity)));
        Assert.Equal(
            new OccupancyFigures(0, 0m, 17m, 0m, 0m, 0m, new CancellationFigures(0, 0m, 0m)),
            report.Rooms[1].Occupancy);
    }

    private OccupancyReport Build(ReportPeriod period, IReadOnlyList<ReportBooking> bookings) =>
        OccupancyReport.Build(period, bookings, [_roomA, _roomB]);
}
