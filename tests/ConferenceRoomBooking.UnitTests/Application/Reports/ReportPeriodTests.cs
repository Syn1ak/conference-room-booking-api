using ConferenceRoomBooking.Application.Reports;

namespace ConferenceRoomBooking.UnitTests.Application.Reports;

public sealed class ReportPeriodTests
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    [Fact]
    public void Create_ForOneDay_CoversThatDayInVenueTime()
    {
        var period = ReportPeriod.Create(new DateOnly(2026, 9, 2), new DateOnly(2026, 9, 2), Kyiv).Value;

        Assert.Equal(1, period.DayCount);
        Assert.Equal([new DateOnly(2026, 9, 2)], period.Days);
        Assert.Equal(new DateTimeOffset(2026, 9, 1, 21, 0, 0, TimeSpan.Zero), period.Start);
        Assert.Equal(new DateTimeOffset(2026, 9, 2, 21, 0, 0, TimeSpan.Zero), period.End);
    }

    [Fact]
    public void Create_InWinter_UsesTheWinterOffset()
    {
        var period = ReportPeriod.Create(new DateOnly(2026, 12, 1), new DateOnly(2026, 12, 31), Kyiv).Value;

        Assert.Equal(31, period.DayCount);
        Assert.Equal(new DateTimeOffset(2026, 11, 30, 22, 0, 0, TimeSpan.Zero), period.Start);
        Assert.Equal(new DateTimeOffset(2026, 12, 31, 22, 0, 0, TimeSpan.Zero), period.End);
    }

    [Fact]
    public void Create_AcrossADaylightSavingChange_UsesEachEndsOwnOffset()
    {
        // Kyiv moves from UTC+3 to UTC+2 at 04:00 on 25 October 2026.
        var period = ReportPeriod.Create(new DateOnly(2026, 10, 24), new DateOnly(2026, 10, 25), Kyiv).Value;

        Assert.Equal(new DateTimeOffset(2026, 10, 23, 21, 0, 0, TimeSpan.Zero), period.Start);
        Assert.Equal(new DateTimeOffset(2026, 10, 25, 22, 0, 0, TimeSpan.Zero), period.End);
    }

    [Fact]
    public void Create_ForTheLongestPeriod_Succeeds()
    {
        var from = new DateOnly(2027, 1, 1);

        var period = ReportPeriod.Create(from, from.AddDays(ReportPeriod.MaxDays - 1), Kyiv);

        Assert.Equal(ReportPeriod.MaxDays, period.Value.DayCount);
    }

    [Fact]
    public void Create_ForLongerThanTheLongestPeriod_Fails()
    {
        var from = new DateOnly(2027, 1, 1);

        var period = ReportPeriod.Create(from, from.AddDays(ReportPeriod.MaxDays), Kyiv);

        Assert.Equal(ReportErrors.PeriodTooLong, period.Error);
    }

    [Fact]
    public void Create_EndingBeforeItStarts_FailsOnTheEndField()
    {
        var period = ReportPeriod.Create(new DateOnly(2026, 9, 2), new DateOnly(2026, 9, 1), Kyiv);

        Assert.Equal(ReportErrors.PeriodEndsBeforeStart, period.Error);
        Assert.Equal([nameof(ReportPeriod.To)], period.Error!.FieldErrors!.Keys);
    }
}
