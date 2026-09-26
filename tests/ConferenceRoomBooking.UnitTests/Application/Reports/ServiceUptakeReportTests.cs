using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Services;
using static ConferenceRoomBooking.UnitTests.Application.Reports.ReportTestData;

namespace ConferenceRoomBooking.UnitTests.Application.Reports;

public sealed class ServiceUptakeReportTests
{
    private static readonly DateOnly September2 = new(2026, 9, 2);
    private static readonly Guid RoomId = Guid.NewGuid();

    private readonly Service _projector = Service.Create("Projector", 500m).Value;
    private readonly Service _sound = Service.Create("Sound", 700m).Value;

    [Fact]
    public void Build_ComparesBookingsWithTheServiceToAllConfirmedBookings()
    {
        var report = Build(
            [
                Booking(RoomId, September2, 8, 9, services: [new ReportBookedService(_projector.Id, 500m)]),
                Booking(RoomId, September2, 9, 10),
                Booking(RoomId, September2, 10, 11),
                Booking(RoomId, September2, 11, 12),
            ]);

        Assert.Equal(4, report.BookingCount);
        Assert.Equal(new ServiceUptake(_projector.Id, "Projector", 1, 0.25m, 500m), report.Services[0]);
    }

    [Fact]
    public void Build_AddsUpTheSavedPrices_NotTheCurrentOnes()
    {
        var report = Build(
            [
                Booking(RoomId, September2, 8, 9, services: [new ReportBookedService(_projector.Id, 650m)]),
                Booking(RoomId, September2, 9, 10, services: [new ReportBookedService(_projector.Id, 400m)]),
            ]);

        var projector = report.Services[0];
        Assert.Equal((2, 1m, 1050m), (projector.BookingCount, projector.AttachRate, projector.Revenue));
    }

    [Fact]
    public void Build_ListsEveryCatalogService_WithZerosForServicesNobodyBooked()
    {
        var report = Build([Booking(RoomId, September2, 8, 9, services: [new ReportBookedService(_projector.Id, 500m)])]);

        Assert.Equal(
            [
                new ServiceUptake(_projector.Id, "Projector", 1, 1m, 500m),
                new ServiceUptake(_sound.Id, "Sound", 0, 0m, 0m),
            ],
            report.Services);
    }

    [Fact]
    public void Build_IgnoresCancelledBookings()
    {
        var report = Build(
            [
                Booking(RoomId, September2, 8, 9),
                Booking(
                    RoomId,
                    September2,
                    9,
                    10,
                    status: BookingStatus.Cancelled,
                    services: [new ReportBookedService(_sound.Id, 700m)]),
            ]);

        Assert.Equal(1, report.BookingCount);
        Assert.Equal(new ServiceUptake(_sound.Id, "Sound", 0, 0m, 0m), report.Services[1]);
    }

    [Fact]
    public void Build_WithoutBookings_ReportsZeros()
    {
        var report = Build([]);

        Assert.Equal(0, report.BookingCount);
        Assert.All(
            report.Services,
            service => Assert.Equal((0, 0m, 0m), (service.BookingCount, service.AttachRate, service.Revenue)));
    }

    private ServiceUptakeReport Build(IReadOnlyList<ReportBooking> bookings) =>
        ServiceUptakeReport.Build(Period(September2, September2), bookings, [_projector, _sound]);
}
