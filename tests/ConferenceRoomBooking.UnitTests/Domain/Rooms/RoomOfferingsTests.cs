using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.UnitTests.Domain.Rooms;

public sealed class RoomOfferingsTests
{
    private readonly Room _room = Room.Create("Room A", 50, 2000m).Value;
    private readonly Service _projector = Service.Create("Projector", 500m).Value;
    private readonly Service _wiFi = Service.Create("Wi-Fi", 300m).Value;

    [Fact]
    public void NewRoom_OffersNoServices()
    {
        Assert.Empty(_room.Offerings);
    }

    [Fact]
    public void OfferService_WithoutPrice_UsesStandardPrice()
    {
        var result = _room.OfferService(_projector);

        Assert.True(result.IsSuccess);
        var offering = Assert.Single(_room.Offerings);
        Assert.Equal(_projector.Id, offering.ServiceId);
        Assert.Same(_projector, offering.Service);
        Assert.Equal(500m, offering.Price);
    }

    [Theory]
    [InlineData(650)]
    [InlineData(0)]
    public void OfferService_WithPrice_UsesThatPrice(decimal price)
    {
        var result = _room.OfferService(_projector, price);

        Assert.True(result.IsSuccess);
        Assert.Equal(price, Assert.Single(_room.Offerings).Price);
    }

    [Fact]
    public void OfferService_SeveralServices_OffersEach()
    {
        _room.OfferService(_projector);
        _room.OfferService(_wiFi);

        Assert.Equal([_projector.Id, _wiFi.Id], _room.Offerings.Select(offering => offering.ServiceId));
    }

    [Fact]
    public void OfferService_AlreadyOffered_FailsAndKeepsExistingOffering()
    {
        _room.OfferService(_projector, 650m);

        var result = _room.OfferService(_projector, 700m);

        Assert.Equal(RoomErrors.ServiceAlreadyOffered, result.Error);
        Assert.Equal(650m, Assert.Single(_room.Offerings).Price);
    }

    [Fact]
    public void OfferService_WithNegativePrice_Fails()
    {
        var result = _room.OfferService(_projector, -1m);

        Assert.Equal(RoomErrors.ServicePriceNegative, result.Error);
        Assert.Empty(_room.Offerings);
    }

    [Fact]
    public void Offering_KeepsItsPrice_WhenStandardPriceChangesLater()
    {
        _room.OfferService(_projector);

        _projector.Update("Projector", 600m);

        Assert.Equal(500m, Assert.Single(_room.Offerings).Price);
    }

    [Fact]
    public void ChangeServicePrice_ChangesOnlyThatOffering()
    {
        _room.OfferService(_projector);
        _room.OfferService(_wiFi);

        var result = _room.ChangeServicePrice(_projector.Id, 550m);

        Assert.True(result.IsSuccess);
        Assert.Equal(550m, _room.Offerings.Single(offering => offering.ServiceId == _projector.Id).Price);
        Assert.Equal(300m, _room.Offerings.Single(offering => offering.ServiceId == _wiFi.Id).Price);
    }

    [Fact]
    public void ChangeServicePrice_ToNegative_FailsAndKeepsPrice()
    {
        _room.OfferService(_projector);

        var result = _room.ChangeServicePrice(_projector.Id, -1m);

        Assert.Equal(RoomErrors.ServicePriceNegative, result.Error);
        Assert.Equal(500m, Assert.Single(_room.Offerings).Price);
    }

    [Fact]
    public void ChangeServicePrice_ForServiceNotOffered_Fails()
    {
        var result = _room.ChangeServicePrice(_projector.Id, 550m);

        Assert.Equal(RoomErrors.ServiceNotOffered, result.Error);
    }

    [Fact]
    public void StopOfferingService_RemovesOnlyThatOffering()
    {
        _room.OfferService(_projector);
        _room.OfferService(_wiFi);

        var result = _room.StopOfferingService(_projector.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(_wiFi.Id, Assert.Single(_room.Offerings).ServiceId);
    }

    [Fact]
    public void StopOfferingService_ForServiceNotOffered_Fails()
    {
        var result = _room.StopOfferingService(_projector.Id);

        Assert.Equal(RoomErrors.ServiceNotOffered, result.Error);
    }

    [Fact]
    public void OfferService_AfterStoppingIt_OffersItAgain()
    {
        _room.OfferService(_projector, 650m);
        _room.StopOfferingService(_projector.Id);

        var result = _room.OfferService(_projector);

        Assert.True(result.IsSuccess);
        Assert.Equal(500m, Assert.Single(_room.Offerings).Price);
    }
}
