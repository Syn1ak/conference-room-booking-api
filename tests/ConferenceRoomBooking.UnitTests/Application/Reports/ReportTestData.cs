using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.UnitTests.Application.Reports;

/// <summary>
/// Bookings as reports read them, on days in the autumn of 2026 in Kyiv.
/// </summary>
internal static class ReportTestData
{
    public static readonly TimeZoneInfo Kyiv = TimeZoneInfo.FindSystemTimeZoneById("Europe/Kyiv");

    /// <summary>"Now" for creating slots: 1 September 2026, 10:00 in Kyiv, before every slot these tests use.</summary>
    public static readonly DateTimeOffset SlotCreationTime = new(2026, 9, 1, 10, 0, 0, TimeSpan.FromHours(3));

    public static ReportPeriod Period(DateOnly from, DateOnly to) => ReportPeriod.Create(from, to, Kyiv).Value;

    /// <summary>A confirmed booking of the room on <paramref name="day"/>, Kyiv time.</summary>
    public static ReportBooking Booking(
        Guid roomId,
        DateOnly day,
        int startHour,
        int endHour,
        decimal rental = 0m,
        decimal total = 0m,
        BookingStatus status = BookingStatus.Confirmed,
        int attendeeCount = 1,
        IReadOnlyList<ReportBookedService>? services = null) =>
        new(roomId, Slot(day, startHour, endHour), status, attendeeCount, rental, total, services ?? []);

    public static BookingSlot Slot(DateOnly day, int startHour, int endHour, int startMinute = 0, int endMinute = 0) =>
        BookingSlot.Create(At(day, startHour, startMinute), At(day, endHour, endMinute), SlotCreationTime, Kyiv).Value;

    /// <summary>The wall-clock time on <paramref name="day"/> in Kyiv, with Kyiv's offset on that day.</summary>
    public static DateTimeOffset At(DateOnly day, int hour, int minute = 0)
    {
        var local = day.ToDateTime(new TimeOnly(hour, minute));
        return new DateTimeOffset(local, Kyiv.GetUtcOffset(local));
    }
}
