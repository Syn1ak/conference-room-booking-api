using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.UnitTests.Domain.Pricing;

public sealed class PricingScheduleTests
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    /// <summary>1 September 2026, 10:00 in Kyiv (summer time, UTC+3).</summary>
    private static readonly DateTimeOffset Now = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));

    private static readonly TimeSpan KyivSummer = TimeSpan.FromHours(3);

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

    [Fact]
    public void Split_AcrossABandBoundary_ReturnsASegmentOnEachSide()
    {
        var segments = PricingSchedule.Split(Slot(11, 45, 12, 15), Kyiv);

        Assert.Equal(
            [
                (TimeBandKind.Standard, At(11, 45), At(12, 0), 0.25m),
                (TimeBandKind.Peak, At(12, 0), At(12, 15), 0.25m),
            ],
            segments.Select(segment => (segment.Band.Kind, segment.Start, segment.End, segment.Hours)));
    }

    [Fact]
    public void Split_WithinOneBand_ReturnsOneSegment()
    {
        var segment = Assert.Single(PricingSchedule.Split(Slot(19, 0, 21, 30), Kyiv));

        Assert.Equal((TimeBandKind.Evening, 0.80m, 2.5m), (segment.Band.Kind, segment.Band.Multiplier, segment.Hours));
    }

    [Fact]
    public void Split_ForAllOpeningHours_ReturnsEveryBand_AddingUpToTheSlotsDuration()
    {
        var slot = Slot(6, 0, 23, 0);

        var segments = PricingSchedule.Split(slot, Kyiv);

        Assert.Equal(PricingSchedule.Bands, segments.Select(segment => segment.Band));
        Assert.Equal((decimal)slot.Duration.TotalHours, segments.Sum(segment => segment.Hours));
    }

    [Fact]
    public void Split_GivenInUtc_AppliesBandsInVenueTime()
    {
        // 09:00–10:00 UTC is 12:00–13:00 in Kyiv.
        var start = new DateTimeOffset(2026, 9, 2, 9, 0, 0, TimeSpan.Zero);
        var slot = BookingSlot.Create(start, start.AddHours(1), Now, Kyiv).Value;

        var segment = Assert.Single(PricingSchedule.Split(slot, Kyiv));

        Assert.Equal((TimeBandKind.Peak, At(12, 0), KyivSummer), (segment.Band.Kind, segment.Start, segment.Start.Offset));
    }

    /// <summary>A slot on 2 September 2026, Kyiv time.</summary>
    private static BookingSlot Slot(int startHour, int startMinute, int endHour, int endMinute) =>
        BookingSlot.Create(At(startHour, startMinute), At(endHour, endMinute), Now, Kyiv).Value;

    /// <summary>A time on 2 September 2026, Kyiv time.</summary>
    private static DateTimeOffset At(int hour, int minute) =>
        new(2026, 9, 2, hour, minute, 0, KyivSummer);
}
