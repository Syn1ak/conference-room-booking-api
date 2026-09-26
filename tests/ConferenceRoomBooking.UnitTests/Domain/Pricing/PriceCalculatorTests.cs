using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.UnitTests.Domain.Pricing;

public sealed class PriceCalculatorTests
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    /// <summary>1 September 2026, 10:00 in Kyiv (summer time, UTC+3).</summary>
    private static readonly DateTimeOffset Now = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));

    private static readonly TimeSpan KyivSummer = TimeSpan.FromHours(3);
    private static readonly TimeSpan KyivWinter = TimeSpan.FromHours(2);

    private static readonly BookedService Projector = new(Guid.NewGuid(), "Projector", 500m);
    private static readonly BookedService WiFi = new(Guid.NewGuid(), "Wi-Fi", 300m);

    [Fact]
    public void Calculate_AcrossPeakHours_ChargesEachBandAndAddsServices()
    {
        var breakdown = Calculate(Slot(11, 0, 15, 0), 2000m, [Projector, WiFi]);

        Assert.Equal(
            [
                (TimeBandKind.Standard, At(11, 0), At(12, 0), 1m, 1.00m, 2000m),
                (TimeBandKind.Peak, At(12, 0), At(14, 0), 2m, 1.15m, 4600m),
                (TimeBandKind.Standard, At(14, 0), At(15, 0), 1m, 1.00m, 2000m),
            ],
            breakdown.RentalLines.Select(line =>
                (line.Band, line.Start, line.End, line.Hours, line.Multiplier, line.Amount)));
        Assert.Equal([Projector, WiFi], breakdown.Services);
        Assert.Equal(8600m, breakdown.RentalPrice);
        Assert.Equal(9400m, breakdown.TotalPrice);
    }

    [Fact]
    public void Calculate_CrossingFromMorningIntoStandard_ChargesPartOfAnHourAtEachRate()
    {
        var breakdown = Calculate(Slot(8, 30, 10, 0), 1500m, []);

        Assert.Equal(
            [(TimeBandKind.Morning, 0.5m, 675m), (TimeBandKind.Standard, 1m, 1500m)],
            breakdown.RentalLines.Select(line => (line.Band, line.Hours, line.Amount)));
        Assert.Equal(2175m, breakdown.TotalPrice);
    }

    [Fact]
    public void Calculate_CrossingFromStandardIntoEvening_AppliesTheEveningDiscount()
    {
        var breakdown = Calculate(Slot(17, 0, 19, 0), 3500m, []);

        Assert.Equal(
            [(TimeBandKind.Standard, 3500m), (TimeBandKind.Evening, 2800m)],
            breakdown.RentalLines.Select(line => (line.Band, line.Amount)));
        Assert.Equal(6300m, breakdown.TotalPrice);
    }

    [Fact]
    public void Calculate_ForAllOpeningHours_ChargesEveryBand()
    {
        var breakdown = Calculate(Slot(6, 0, 23, 0), 2000m, []);

        Assert.Equal(
            [5400m, 6000m, 4600m, 8000m, 8000m],
            breakdown.RentalLines.Select(line => line.Amount));
        Assert.Equal(32000m, breakdown.RentalPrice);
    }

    [Fact]
    public void Calculate_WithinOneBand_ReturnsOneLine()
    {
        var breakdown = Calculate(Slot(12, 15, 13, 45), 2000m, []);

        var line = Assert.Single(breakdown.RentalLines);
        Assert.Equal((TimeBandKind.Peak, 1.5m, 3450m), (line.Band, line.Hours, line.Amount));
    }

    [Fact]
    public void Calculate_StartingAndEndingOnBandBoundaries_AddsNoEmptyLines()
    {
        var breakdown = Calculate(Slot(9, 0, 14, 0), 2000m, []);

        Assert.Equal(
            [TimeBandKind.Standard, TimeBandKind.Peak],
            breakdown.RentalLines.Select(line => line.Band));
    }

    [Fact]
    public void Calculate_GivenInUtc_AppliesBandsInVenueTime()
    {
        // 08:00–10:00 UTC looks like morning and standard hours, but it's 11:00–13:00 in Kyiv.
        var start = new DateTimeOffset(2026, 9, 2, 8, 0, 0, TimeSpan.Zero);
        var slot = BookingSlot.Create(start, start.AddHours(2), Now, Kyiv).Value;

        var breakdown = Calculate(slot, 2000m, []);

        Assert.Equal(
            [
                (TimeBandKind.Standard, At(11, 0), At(12, 0)),
                (TimeBandKind.Peak, At(12, 0), At(13, 0)),
            ],
            breakdown.RentalLines.Select(line => (line.Band, line.Start, line.End)));
        Assert.All(breakdown.RentalLines, line => Assert.Equal(KyivSummer, line.Start.Offset));
        Assert.Equal(4300m, breakdown.RentalPrice);
    }

    [Theory]
    [InlineData(2026, 10, 25, 2)] // Kyiv moves from UTC+3 to UTC+2 at 04:00.
    [InlineData(2027, 3, 28, 3)] // Kyiv moves from UTC+2 to UTC+3 at 03:00.
    public void Calculate_OnDaylightSavingChangeDay_UsesTheDaysLocalHours(
        int year, int month, int day, int offsetHours)
    {
        var offset = TimeSpan.FromHours(offsetHours);
        var start = new DateTimeOffset(year, month, day, 11, 0, 0, offset);
        var slot = BookingSlot.Create(start, start.AddHours(2), Now, Kyiv).Value;

        var breakdown = Calculate(slot, 2000m, []);

        Assert.Equal(
            [
                (TimeBandKind.Standard, start, start.AddHours(1)),
                (TimeBandKind.Peak, start.AddHours(1), start.AddHours(2)),
            ],
            breakdown.RentalLines.Select(line => (line.Band, line.Start, line.End)));
        Assert.All(breakdown.RentalLines, line => Assert.Equal(offset, line.Start.Offset));
        Assert.Equal(4300m, breakdown.RentalPrice);
    }

    [Fact]
    public void Calculate_InWinter_UsesTheWinterOffsetOnLines()
    {
        var start = new DateTimeOffset(2026, 12, 1, 18, 0, 0, KyivWinter);
        var slot = BookingSlot.Create(start, start.AddHours(1), Now, Kyiv).Value;

        var line = Assert.Single(Calculate(slot, 2000m, []).RentalLines);

        Assert.Equal((TimeBandKind.Evening, start, 1600m), (line.Band, line.Start, line.Amount));
    }

    [Fact]
    public void Calculate_RoundsEachLineAwayFromZero_AndSumsTheRoundedLines()
    {
        // Unrounded, the lines are 0.005 and 0.00575, which would total 0.01075.
        var breakdown = Calculate(Slot(11, 45, 12, 15), 0.02m, []);

        Assert.Equal([0.01m, 0.01m], breakdown.RentalLines.Select(line => line.Amount));
        Assert.Equal(0.02m, breakdown.RentalPrice);
    }

    [Fact]
    public void Calculate_WithPriceNeedingRounding_RoundsToKopiykas()
    {
        var breakdown = Calculate(Slot(12, 0, 12, 45), 1999.99m, []);

        // 0.75 h × 1999.99 × 1.15 = 1724.991375
        Assert.Equal(1724.99m, Assert.Single(breakdown.RentalLines).Amount);
    }

    [Fact]
    public void Calculate_ChargesServicesTheSame_WhateverTheBookingLength()
    {
        var shortBooking = Calculate(Slot(10, 0, 10, 30), 2000m, [Projector]);
        var longBooking = Calculate(Slot(6, 0, 23, 0), 2000m, [Projector]);

        Assert.Equal(500m, shortBooking.TotalPrice - shortBooking.RentalPrice);
        Assert.Equal(500m, longBooking.TotalPrice - longBooking.RentalPrice);
    }

    [Fact]
    public void Calculate_WithoutServices_TotalEqualsRental()
    {
        var breakdown = Calculate(Slot(10, 0, 12, 0), 2000m, []);

        Assert.Empty(breakdown.Services);
        Assert.Equal(4000m, breakdown.TotalPrice);
    }

    [Fact]
    public void Calculate_ForFreeRoom_ChargesOnlyServices()
    {
        var breakdown = Calculate(Slot(11, 0, 15, 0), 0m, [WiFi]);

        Assert.All(breakdown.RentalLines, line => Assert.Equal(0m, line.Amount));
        Assert.Equal(0m, breakdown.RentalPrice);
        Assert.Equal(300m, breakdown.TotalPrice);
    }

    private static PriceBreakdown Calculate(
        BookingSlot slot, decimal hourlyPrice, IReadOnlyCollection<BookedService> services) =>
        PriceCalculator.Calculate(slot, hourlyPrice, services, Kyiv);

    /// <summary>A slot on 2 September 2026, Kyiv time.</summary>
    private static BookingSlot Slot(int startHour, int startMinute, int endHour, int endMinute) =>
        BookingSlot.Create(At(startHour, startMinute), At(endHour, endMinute), Now, Kyiv).Value;

    /// <summary>A time on 2 September 2026, Kyiv time.</summary>
    private static DateTimeOffset At(int hour, int minute) =>
        new(2026, 9, 2, hour, minute, 0, KyivSummer);
}
