using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Pricing;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.UnitTests.Domain.Bookings;

public sealed class BookingTests
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");
    private static readonly DateTimeOffset Now = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));
    private static readonly Guid ClientId = Guid.Parse("7b0d7f5e-3c1a-4c55-9d8e-2f6a1b3c4d5e");

    private readonly BookingSlot _slot = BookingSlot.Create(
        new DateTimeOffset(2026, 9, 2, 10, 0, 0, TimeSpan.FromHours(3)),
        new DateTimeOffset(2026, 9, 2, 14, 0, 0, TimeSpan.FromHours(3)),
        Now,
        Kyiv).Value;

    private readonly Room _room = Room.Create("Room A", 50, 2000m).Value;
    private readonly Service _projector = Service.Create("Projector", 500m).Value;
    private readonly Service _wiFi = Service.Create("Wi-Fi", 300m).Value;
    private readonly Service _sound = Service.Create("Sound", 700m).Value;

    public BookingTests()
    {
        _room.OfferService(_projector, 650m);
        _room.OfferService(_wiFi);
    }

    [Fact]
    public void Create_WithValidData_ReturnsConfirmedBooking()
    {
        var result = Create(40, []);

        Assert.True(result.IsSuccess);
        var booking = result.Value;
        Assert.NotEqual(Guid.Empty, booking.Id);
        Assert.Equal(_room.Id, booking.RoomId);
        Assert.Equal(ClientId, booking.ClientId);
        Assert.Equal(_slot, booking.Slot);
        Assert.Equal(40, booking.AttendeeCount);
        Assert.Equal(BookingStatus.Confirmed, booking.Status);
        Assert.Equal(2000m, booking.RoomHourlyPrice);
        Assert.Empty(booking.BookedServices);
    }

    [Fact]
    public void Create_SavesRentalAndTotalPrice()
    {
        // 10:00–12:00 standard (4000) + 12:00–14:00 peak (4600), plus Projector at its room price (650) and Wi-Fi (300).
        var booking = Create(40, [_projector.Id, _wiFi.Id]).Value;

        Assert.Equal(8600m, booking.RentalPrice);
        Assert.Equal(9550m, booking.TotalPrice);
    }

    [Fact]
    public void Create_SavesThePriceTheCalculatorGivesForTheSavedInputs()
    {
        var booking = Create(40, [_projector.Id]).Value;

        var breakdown = PriceCalculator.Calculate(booking.Slot, booking.RoomHourlyPrice, booking.BookedServices, Kyiv);
        Assert.Equal(breakdown.RentalPrice, booking.RentalPrice);
        Assert.Equal(breakdown.TotalPrice, booking.TotalPrice);
    }

    [Fact]
    public void Create_WithServices_SavesTheirNamesAndRoomPrices()
    {
        var result = Create(40, [_projector.Id, _wiFi.Id]);

        Assert.Equal(
            [("Projector", 650m), ("Wi-Fi", 300m)],
            result.Value.BookedServices.Select(service => (service.Name, service.Price)));
        Assert.Equal([_projector.Id, _wiFi.Id], result.Value.BookedServices.Select(service => service.ServiceId));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_WithoutAttendees_Fails(int attendeeCount)
    {
        var result = Create(attendeeCount, []);

        Assert.Equal(BookingErrors.NoAttendees, result.Error);
    }

    [Fact]
    public void Create_WithAttendeesEqualToCapacity_Succeeds()
    {
        var result = Create(50, []);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void Create_WithMoreAttendeesThanCapacity_Fails()
    {
        var result = Create(51, []);

        Assert.Equal("Booking.ExceedsCapacity", result.Error?.Code);
        Assert.Contains("50", result.Error?.Description);
    }

    [Fact]
    public void Create_WithServiceTheRoomDoesNotOffer_Fails()
    {
        var result = Create(40, [_projector.Id, _sound.Id]);

        Assert.Equal("Booking.ServiceNotOffered", result.Error?.Code);
        Assert.Contains(_sound.Id.ToString(), result.Error?.Description);
    }

    [Fact]
    public void Create_WithSameServiceTwice_Fails()
    {
        var result = Create(40, [_projector.Id, _projector.Id]);

        Assert.Equal(BookingErrors.ServiceChosenTwice, result.Error);
    }

    [Fact]
    public void Booking_KeepsSavedPrices_WhenRoomAndServicesChangeLater()
    {
        var booking = Create(40, [_projector.Id, _wiFi.Id]).Value;

        _room.Update("Room A", 50, 2500m);
        _room.ChangeServicePrice(_projector.Id, 900m);
        _room.StopOfferingService(_wiFi.Id);
        _projector.Update("HD projector", 800m);

        Assert.Equal(2000m, booking.RoomHourlyPrice);
        Assert.Equal(
            [("Projector", 650m), ("Wi-Fi", 300m)],
            booking.BookedServices.Select(service => (service.Name, service.Price)));
        Assert.Equal(8600m, booking.RentalPrice);
        Assert.Equal(9550m, booking.TotalPrice);
    }

    [Fact]
    public void Booking_StaysValid_WhenRoomCapacityShrinksLater()
    {
        var booking = Create(40, []).Value;

        _room.Update("Room A", 30, 2000m);

        Assert.Equal(40, booking.AttendeeCount);
        Assert.Equal(BookingStatus.Confirmed, booking.Status);
    }

    private Result<Booking> Create(int attendeeCount, IReadOnlyCollection<Guid> serviceIds) =>
        Booking.Create(_room, ClientId, _slot, attendeeCount, serviceIds, Kyiv);
}
