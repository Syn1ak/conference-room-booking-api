using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.UnitTests.Domain.Pricing;

public sealed class PricingScheduleTests
{
    [Fact]
    public void Bands_CoverExactlyTheOpeningHours()
    {
        Assert.Equal(BookingSlot.OpeningTime, PricingSchedule.Bands[0].Start);
        Assert.Equal(BookingSlot.ClosingTime, PricingSchedule.Bands[^1].End);
    }

    [Fact]
    public void Bands_FollowEachOtherWithoutGapsOrOverlaps()
    {
        var bands = PricingSchedule.Bands;

        Assert.All(bands, band => Assert.True(band.Start < band.End));
        Assert.All(bands.Zip(bands.Skip(1)), pair => Assert.Equal(pair.First.End, pair.Second.Start));
    }

    [Fact]
    public void Bands_HavePositiveMultipliers()
    {
        Assert.All(PricingSchedule.Bands, band => Assert.True(band.Multiplier > 0));
    }

    [Fact]
    public void Bands_MatchTheRatesFromTheTask()
    {
        Assert.Equal(
            [
                (TimeBandKind.Morning, new TimeOnly(6, 0), new TimeOnly(9, 0), 0.90m),
                (TimeBandKind.Standard, new TimeOnly(9, 0), new TimeOnly(12, 0), 1.00m),
                (TimeBandKind.Peak, new TimeOnly(12, 0), new TimeOnly(14, 0), 1.15m),
                (TimeBandKind.Standard, new TimeOnly(14, 0), new TimeOnly(18, 0), 1.00m),
                (TimeBandKind.Evening, new TimeOnly(18, 0), new TimeOnly(23, 0), 0.80m),
            ],
            PricingSchedule.Bands.Select(band => (band.Kind, band.Start, band.End, band.Multiplier)));
    }
}
