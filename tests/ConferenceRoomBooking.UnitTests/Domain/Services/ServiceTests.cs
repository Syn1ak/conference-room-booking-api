using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.UnitTests.Domain.Services;

public sealed class ServiceTests
{
    [Fact]
    public void Create_WithValidData_ReturnsServiceWithNewId()
    {
        var result = Service.Create("Projector", 500m);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value.Id);
        Assert.Equal("Projector", result.Value.Name);
        Assert.Equal(500m, result.Value.StandardPrice);
    }

    [Fact]
    public void Create_TrimsName()
    {
        var result = Service.Create("  Wi-Fi  ", 300m);

        Assert.Equal("Wi-Fi", result.Value.Name);
    }

    [Fact]
    public void Create_AllowsFreeService()
    {
        var result = Service.Create("Water", 0m);

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void Create_AllowsNameOfMaximumLength()
    {
        var result = Service.Create(new string('a', Service.NameMaxLength), 500m);

        Assert.True(result.IsSuccess);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankName_Fails(string name)
    {
        var result = Service.Create(name, 500m);

        Assert.Equal(ServiceErrors.NameRequired, result.Error);
    }

    [Fact]
    public void Create_WithTooLongName_Fails()
    {
        var result = Service.Create(new string('a', Service.NameMaxLength + 1), 500m);

        Assert.Equal(ServiceErrors.NameTooLong, result.Error);
    }

    [Fact]
    public void Create_WithNegativePrice_Fails()
    {
        var result = Service.Create("Projector", -0.01m);

        Assert.Equal(ServiceErrors.StandardPriceNegative, result.Error);
    }

    [Fact]
    public void Update_WithValidData_ChangesNameAndPrice()
    {
        var service = Service.Create("Sound", 700m).Value;

        var result = service.Update(" Sound system ", 800m);

        Assert.True(result.IsSuccess);
        Assert.Equal("Sound system", service.Name);
        Assert.Equal(800m, service.StandardPrice);
    }

    [Fact]
    public void Update_WithInvalidData_FailsAndLeavesServiceUnchanged()
    {
        var service = Service.Create("Sound", 700m).Value;

        var result = service.Update("Sound system", -1m);

        Assert.Equal(ServiceErrors.StandardPriceNegative, result.Error);
        Assert.Equal("Sound", service.Name);
        Assert.Equal(700m, service.StandardPrice);
    }
}
