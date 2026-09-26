using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.UnitTests.Domain.Rooms;

public sealed class RoomReplaceOfferingsTests
{
    private readonly Room _room = Room.Create("Room A", 50, 2000m).Value;
    private readonly Service _projector = Service.Create("Projector", 500m).Value;
    private readonly Service _wiFi = Service.Create("Wi-Fi", 300m).Value;
    private readonly Service _sound = Service.Create("Sound", 700m).Value;

    public RoomReplaceOfferingsTests()
    {
        _room.OfferService(_projector, 550m);
        _room.OfferService(_wiFi);
    }

    [Fact]
    public void ReplaceOfferings_AddsChangesAndRemoves()
    {
        var result = _room.ReplaceOfferings([(_projector, 600m), (_sound, 750m)]);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            [(_projector.Id, 600m), (_sound.Id, 750m)],
            _room.Offerings.Select(offering => (offering.ServiceId, offering.Price)).OrderBy(pair => pair.Price));
    }

    [Fact]
    public void ReplaceOfferings_WithoutPrice_UsesStandardPrice_EvenForAServiceAlreadyOffered()
    {
        var result = _room.ReplaceOfferings([(_projector, null), (_sound, null)]);

        Assert.True(result.IsSuccess);
        Assert.Equal(500m, _room.Offerings.Single(offering => offering.ServiceId == _projector.Id).Price);
        Assert.Equal(700m, _room.Offerings.Single(offering => offering.ServiceId == _sound.Id).Price);
    }

    [Fact]
    public void ReplaceOfferings_WithTheSameServices_KeepsTheExistingOfferings()
    {
        var projectorOffering = _room.Offerings.Single(offering => offering.ServiceId == _projector.Id);

        var result = _room.ReplaceOfferings([(_projector, 550m), (_wiFi, 300m)]);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, _room.Offerings.Count);
        Assert.Same(projectorOffering, _room.Offerings.Single(offering => offering.ServiceId == _projector.Id));
    }

    [Fact]
    public void ReplaceOfferings_WithEmptyList_RemovesAll()
    {
        var result = _room.ReplaceOfferings([]);

        Assert.True(result.IsSuccess);
        Assert.Empty(_room.Offerings);
    }

    [Fact]
    public void ReplaceOfferings_WithAServiceListedTwice_FailsAndChangesNothing()
    {
        var result = _room.ReplaceOfferings([(_sound, null), (_sound, 800m)]);

        Assert.Equal(RoomErrors.ServiceListedTwice, result.Error);
        AssertUnchanged();
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10.555)]
    public void ReplaceOfferings_WithAnInvalidPrice_FailsAndChangesNothing(decimal price)
    {
        var result = _room.ReplaceOfferings([(_sound, 100m), (_projector, price)]);

        Assert.False(result.IsSuccess);
        AssertUnchanged();
    }

    private void AssertUnchanged() =>
        Assert.Equal(
            [(_projector.Id, 550m), (_wiFi.Id, 300m)],
            _room.Offerings.Select(offering => (offering.ServiceId, offering.Price)).OrderByDescending(pair => pair.Price));
}
