using System.Globalization;
using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.UnitTests.Domain.Common;

public sealed class PricesTests
{
    [Theory]
    [InlineData("0")]
    [InlineData("500")]
    [InlineData("500.5")]
    [InlineData("500.55")]
    [InlineData("500.500")]
    [InlineData("-0.01")]
    public void IsInWholeKopiykas_WithAtMostTwoSignificantDecimals_IsTrue(string price)
    {
        Assert.True(Prices.IsInWholeKopiykas(Parse(price)));
    }

    [Theory]
    [InlineData("500.555")]
    [InlineData("0.001")]
    [InlineData("500.5001")]
    public void IsInWholeKopiykas_WithMoreDecimals_IsFalse(string price)
    {
        Assert.False(Prices.IsInWholeKopiykas(Parse(price)));
    }

    // Decimal literals can't be attribute arguments, and doubles would lose the trailing zeros under test.
    private static decimal Parse(string price) => decimal.Parse(price, CultureInfo.InvariantCulture);
}
