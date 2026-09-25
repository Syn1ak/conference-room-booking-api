using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.UnitTests.Domain.Bookings;

public sealed class BookingSlotTests
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    /// <summary>1 September 2026, 10:00 in Kyiv (summer time, UTC+3).</summary>
    private static readonly DateTimeOffset Now = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));

    private static readonly TimeSpan KyivSummer = TimeSpan.FromHours(3);

    [Fact]
    public void Create_WithValidSlot_StoresStartAndEndInUtc()
    {
        var result = Create(At(2, 10, 0), At(2, 14, 0));

        Assert.True(result.IsSuccess);
        Assert.Equal(new DateTimeOffset(2026, 9, 2, 7, 0, 0, TimeSpan.Zero), result.Value.Start);
        Assert.Equal(TimeSpan.Zero, result.Value.Start.Offset);
        Assert.Equal(TimeSpan.Zero, result.Value.End.Offset);
        Assert.Equal(TimeSpan.FromHours(4), result.Value.Duration);
    }

    [Theory]
    [InlineData(10, 0, 10, 0)]
    [InlineData(10, 0, 9, 0)]
    public void Create_WhenEndIsNotAfterStart_Fails(int startHour, int startMinute, int endHour, int endMinute)
    {
        var result = Create(At(2, startHour, startMinute), At(2, endHour, endMinute));

        Assert.Equal(BookingErrors.EndNotAfterStart, result.Error);
    }

    [Fact]
    public void Create_StartingAtOpeningTime_Succeeds()
    {
        Assert.True(Create(At(2, 6, 0), At(2, 7, 0)).IsSuccess);
    }

    [Fact]
    public void Create_EndingAtClosingTime_Succeeds()
    {
        Assert.True(Create(At(2, 22, 0), At(2, 23, 0)).IsSuccess);
    }

    [Fact]
    public void Create_CoveringAllOpeningHours_Succeeds()
    {
        Assert.True(Create(At(2, 6, 0), At(2, 23, 0)).IsSuccess);
    }

    [Fact]
    public void Create_StartingBeforeOpeningTime_Fails()
    {
        var result = Create(At(2, 5, 45), At(2, 7, 0));

        Assert.Equal(BookingErrors.OutsideOpeningHours, result.Error);
    }

    [Fact]
    public void Create_EndingAfterClosingTime_Fails()
    {
        var result = Create(At(2, 22, 0), At(2, 23, 15));

        Assert.Equal(BookingErrors.OutsideOpeningHours, result.Error);
    }

    [Fact]
    public void Create_CrossingMidnight_Fails()
    {
        var result = Create(At(2, 22, 0), At(3, 7, 0));

        Assert.Equal(BookingErrors.OutsideOpeningHours, result.Error);
    }

    [Fact]
    public void Create_GivenInUtc_IsJudgedInVenueTime()
    {
        // 05:00–06:00 UTC would be before opening in UTC, but it's 08:00–09:00 in Kyiv.
        var start = new DateTimeOffset(2026, 9, 2, 5, 0, 0, TimeSpan.Zero);

        var result = Create(start, start.AddHours(1));

        Assert.True(result.IsSuccess);
        Assert.Equal(start, result.Value.Start);
    }

    [Fact]
    public void Create_GivenInUtc_OutsideVenueHours_Fails()
    {
        // 21:00–22:00 UTC looks like evening hours, but it's 00:00–01:00 the next day in Kyiv.
        var start = new DateTimeOffset(2026, 9, 2, 21, 0, 0, TimeSpan.Zero);

        var result = Create(start, start.AddHours(1));

        Assert.Equal(BookingErrors.OutsideOpeningHours, result.Error);
    }

    [Fact]
    public void Create_AroundDaylightSavingChange_UsesEachDaysOffset()
    {
        // Kyiv moves from UTC+2 to UTC+3 at 03:00 on Sunday 28 March 2027, before opening time.
        var saturdayAt0300Utc = new DateTimeOffset(2027, 3, 27, 3, 0, 0, TimeSpan.Zero); // 05:00 at UTC+2
        var saturdayAt0400Utc = new DateTimeOffset(2027, 3, 27, 4, 0, 0, TimeSpan.Zero); // 06:00 at UTC+2
        var sundayAt0300Utc = new DateTimeOffset(2027, 3, 28, 3, 0, 0, TimeSpan.Zero); // 06:00 at UTC+3

        Assert.Equal(
            BookingErrors.OutsideOpeningHours,
            Create(saturdayAt0300Utc, saturdayAt0300Utc.AddHours(1)).Error);
        Assert.True(Create(saturdayAt0400Utc, saturdayAt0400Utc.AddHours(1)).IsSuccess);
        Assert.True(Create(sundayAt0300Utc, sundayAt0300Utc.AddHours(1)).IsSuccess);
    }

    [Theory]
    [InlineData(10, 10, 11, 0)]
    [InlineData(10, 0, 11, 5)]
    public void Create_OffTheTimeGrid_Fails(int startHour, int startMinute, int endHour, int endMinute)
    {
        var result = Create(At(2, startHour, startMinute), At(2, endHour, endMinute));

        Assert.Equal(BookingErrors.NotOnTimeGrid, result.Error);
    }

    [Fact]
    public void Create_WithSeconds_Fails()
    {
        var result = Create(At(2, 10, 0).AddSeconds(30), At(2, 11, 0));

        Assert.Equal(BookingErrors.NotOnTimeGrid, result.Error);
    }

    [Fact]
    public void Create_LastingMinimumDuration_Succeeds()
    {
        Assert.True(Create(At(2, 10, 0), At(2, 10, 30)).IsSuccess);
    }

    [Fact]
    public void Create_ShorterThanMinimumDuration_Fails()
    {
        var result = Create(At(2, 10, 0), At(2, 10, 15));

        Assert.Equal(BookingErrors.TooShort, result.Error);
    }

    [Fact]
    public void Create_StartingNow_Fails()
    {
        var result = Create(Now, Now.AddHours(1));

        Assert.Equal(BookingErrors.StartsInPast, result.Error);
    }

    [Fact]
    public void Create_StartingInThePast_Fails()
    {
        var result = Create(Now.AddDays(-1), Now.AddDays(-1).AddHours(1));

        Assert.Equal(BookingErrors.StartsInPast, result.Error);
    }

    [Fact]
    public void Create_StartingOneStepFromNow_Succeeds()
    {
        var start = Now.Add(BookingSlot.TimeStep);

        Assert.True(Create(start, start.AddHours(1)).IsSuccess);
    }

    [Fact]
    public void Create_StartingExactlyOneYearAhead_Succeeds()
    {
        var start = Now.AddYears(1);

        Assert.True(Create(start, start.AddHours(1)).IsSuccess);
    }

    [Fact]
    public void Create_StartingMoreThanOneYearAhead_Fails()
    {
        var start = Now.AddYears(1).Add(BookingSlot.TimeStep);

        var result = Create(start, start.AddHours(1));

        Assert.Equal(BookingErrors.TooFarAhead, result.Error);
    }

    [Theory]
    [InlineData(12, 14, false)] // back to back after
    [InlineData(8, 10, false)] // back to back before
    [InlineData(14, 16, false)] // separate
    [InlineData(11, 13, true)] // partly overlapping
    [InlineData(9, 11, true)] // partly overlapping from before
    [InlineData(10, 12, true)] // identical
    [InlineData(9, 13, true)] // containing
    public void Overlaps_ComparedWithTenToTwelve(int otherStartHour, int otherEndHour, bool expected)
    {
        var slot = Create(At(2, 10, 0), At(2, 12, 0)).Value;
        var other = Create(At(2, otherStartHour, 0), At(2, otherEndHour, 0)).Value;

        Assert.Equal(expected, slot.Overlaps(other));
        Assert.Equal(expected, other.Overlaps(slot));
    }

    [Fact]
    public void Slots_WithSameTimes_AreEqual()
    {
        var givenInKyivTime = Create(At(2, 10, 0), At(2, 12, 0)).Value;
        var givenInUtc = Create(At(2, 10, 0).ToUniversalTime(), At(2, 12, 0).ToUniversalTime()).Value;

        Assert.Equal(givenInKyivTime, givenInUtc);
    }

    private static Result<BookingSlot> Create(DateTimeOffset start, DateTimeOffset end) =>
        BookingSlot.Create(start, end, Now, Kyiv);

    /// <summary>A time in September 2026, Kyiv time.</summary>
    private static DateTimeOffset At(int day, int hour, int minute) =>
        new(2026, 9, day, hour, minute, 0, KyivSummer);
}
