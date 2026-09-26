using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.UnitTests.Domain.Rooms;

public sealed class RoomTests
{
    [Fact]
    public void Create_WithValidData_ReturnsRoomWithNewId()
    {
        var result = Room.Create("Room A", 50, 2000m);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value.Id);
        Assert.Equal("Room A", result.Value.Name);
        Assert.Equal(50, result.Value.Capacity);
        Assert.Equal(2000m, result.Value.HourlyPrice);
    }

    [Fact]
    public void Create_TrimsName()
    {
        var result = Room.Create("  Room B  ", 100, 3500m);

        Assert.Equal("Room B", result.Value.Name);
    }

    [Fact]
    public void Create_AllowsNameOfMaximumLength()
    {
        var result = Room.Create(new string('a', Room.NameMaxLength), 50, 2000m);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void Create_AllowsSinglePersonRoomAndFreeRental()
    {
        var result = Room.Create("Phone booth", 1, 0m);

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankName_Fails(string name)
    {
        var result = Room.Create(name, 50, 2000m);

        Assert.Equal(RoomErrors.NameRequired, result.Error);
    }

    [Fact]
    public void Create_WithTooLongName_Fails()
    {
        var result = Room.Create(new string('a', Room.NameMaxLength + 1), 50, 2000m);

        Assert.Equal(RoomErrors.NameTooLong, result.Error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public void Create_WithCapacityBelowOne_Fails(int capacity)
    {
        var result = Room.Create("Room A", capacity, 2000m);

        Assert.Equal(RoomErrors.CapacityNotPositive, result.Error);
    }

    [Fact]
    public void Create_WithNegativeHourlyPrice_Fails()
    {
        var result = Room.Create("Room A", 50, -0.01m);

        Assert.Equal(RoomErrors.HourlyPriceNegative, result.Error);
    }

    [Fact]
    public void Create_WithHourlyPriceInKopiykas_Succeeds()
    {
        var result = Room.Create("Room A", 50, 1999.99m);

        Assert.Equal(1999.99m, result.Value.HourlyPrice);
    }

    [Fact]
    public void Create_WithTrailingZeroDecimals_Succeeds()
    {
        Assert.True(Room.Create("Room A", 50, 2000.500m).IsSuccess);
    }

    [Fact]
    public void Create_WithHourlyPriceOfMoreThanTwoDecimals_Fails()
    {
        var result = Room.Create("Room A", 50, 1999.995m);

        Assert.Equal(RoomErrors.HourlyPriceTooPrecise, result.Error);
    }

    [Fact]
    public void Update_WithValidData_ChangesNameCapacityAndPrice()
    {
        var room = Room.Create("Room A", 50, 2000m).Value;

        var result = room.Update(" Room A+ ", 60, 2500m);

        Assert.True(result.IsSuccess);
        Assert.Equal("Room A+", room.Name);
        Assert.Equal(60, room.Capacity);
        Assert.Equal(2500m, room.HourlyPrice);
    }

    [Theory]
    [InlineData("", 60, 2500, "Room.NameRequired")]
    [InlineData("Room A+", 0, 2500, "Room.CapacityNotPositive")]
    [InlineData("Room A+", 60, -1, "Room.HourlyPriceNegative")]
    [InlineData("Room A+", 60, 2500.555, "Room.HourlyPriceTooPrecise")]
    public void Update_WithInvalidData_FailsAndLeavesRoomUnchanged(
        string name, int capacity, decimal hourlyPrice, string expectedErrorCode)
    {
        var room = Room.Create("Room A", 50, 2000m).Value;

        var result = room.Update(name, capacity, hourlyPrice);

        Assert.Equal(expectedErrorCode, result.Error?.Code);
        Assert.Equal("Room A", room.Name);
        Assert.Equal(50, room.Capacity);
        Assert.Equal(2000m, room.HourlyPrice);
    }

    [Fact]
    public void Update_WithTooLongName_Fails()
    {
        var room = Room.Create("Room A", 50, 2000m).Value;

        var result = room.Update(new string('a', Room.NameMaxLength + 1), 50, 2000m);

        Assert.Equal(RoomErrors.NameTooLong, result.Error);
    }
}
