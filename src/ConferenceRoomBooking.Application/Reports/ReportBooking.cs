using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// The parts of a booking that reports read, with the prices saved when it was made.
/// </summary>
/// <param name="RentalPrice">The room rental in UAH, after time-of-day discounts and surcharges.</param>
/// <param name="TotalPrice">The room rental plus the services in UAH.</param>
public sealed record ReportBooking(
    Guid RoomId,
    BookingSlot Slot,
    BookingStatus Status,
    int AttendeeCount,
    decimal RentalPrice,
    decimal TotalPrice,
    IReadOnlyList<ReportBookedService> Services)
{
    /// <summary>How long the booking lasts, in hours, which can be fractional.</summary>
    public decimal Hours => (decimal)Slot.Duration.Ticks / TimeSpan.TicksPerHour;

    /// <summary>The day the booking takes place on, in venue time. Bookings never cross midnight.</summary>
    public DateOnly DayIn(TimeZoneInfo venueTimeZone) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(Slot.Start, venueTimeZone).DateTime);
}

/// <summary>
/// A service included in a booking, at the price in UAH charged for it.
/// </summary>
public sealed record ReportBookedService(Guid ServiceId, decimal Price);
