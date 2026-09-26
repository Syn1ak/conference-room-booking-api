using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.UnitTests.Domain.Bookings;

public sealed class BookingCancellationTests
{
    private static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");
    private static readonly DateTimeOffset BookedAt = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));
    private static readonly DateTimeOffset Start = new(2026, 9, 2, 10, 0, 0, TimeSpan.FromHours(3));

    private readonly Booking _booking = Booking.Create(
        Room.Create("Room A", 50, 2000m).Value,
        Guid.Parse("7b0d7f5e-3c1a-4c55-9d8e-2f6a1b3c4d5e"),
        BookingSlot.Create(Start, Start.AddHours(4), BookedAt, Kyiv).Value,
        40,
        [],
        Kyiv).Value;

    [Fact]
    public void NewBooking_IsNotCancelled()
    {
        Assert.Equal(BookingStatus.Confirmed, _booking.Status);
        Assert.Null(_booking.CancelledAt);
    }

    [Fact]
    public void Cancel_BeforeStart_CancelsAndRecordsTimeInUtc()
    {
        var now = Start.AddHours(-2);

        var result = _booking.Cancel(now);

        Assert.True(result.IsSuccess);
        Assert.Equal(BookingStatus.Cancelled, _booking.Status);
        Assert.Equal(now, _booking.CancelledAt);
        Assert.Equal(TimeSpan.Zero, _booking.CancelledAt?.Offset);
    }

    [Fact]
    public void Cancel_OneTickBeforeStart_Succeeds()
    {
        var result = _booking.Cancel(Start.AddTicks(-1));

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void Cancel_AtStart_Fails()
    {
        var result = _booking.Cancel(Start);

        Assert.Equal(BookingErrors.AlreadyStarted, result.Error);
        Assert.Equal(BookingStatus.Confirmed, _booking.Status);
        Assert.Null(_booking.CancelledAt);
    }

    [Fact]
    public void Cancel_AfterStart_Fails()
    {
        var result = _booking.Cancel(Start.AddHours(1));

        Assert.Equal(BookingErrors.AlreadyStarted, result.Error);
    }

    [Fact]
    public void Cancel_Twice_FailsAndKeepsFirstCancellationTime()
    {
        var firstCancellation = Start.AddHours(-3);
        _booking.Cancel(firstCancellation);

        var result = _booking.Cancel(Start.AddHours(-1));

        Assert.Equal(BookingErrors.AlreadyCancelled, result.Error);
        Assert.Equal(firstCancellation, _booking.CancelledAt);
    }
}
