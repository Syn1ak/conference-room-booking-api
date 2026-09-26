using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Api.Bookings;

/// <summary>
/// A booking with the prices saved when it was made. Times are in the venue's offset.
/// </summary>
/// <param name="Id">The booking's id.</param>
/// <param name="RoomId">The booked room.</param>
/// <param name="ClientId">The client who made the booking.</param>
/// <param name="Start">When the booking starts.</param>
/// <param name="End">When the booking ends.</param>
/// <param name="DurationMinutes">How long the booking lasts.</param>
/// <param name="AttendeeCount">How many people attend.</param>
/// <param name="Status">Confirmed, or Cancelled once the client cancels it.</param>
/// <param name="CancelledAt">When the booking was cancelled, or null while it's confirmed.</param>
/// <param name="RoomHourlyPrice">The room's base hourly price in UAH when the booking was made.</param>
/// <param name="Services">The chosen services at the prices charged for them.</param>
/// <param name="RentalPrice">The room rental in UAH, after time-of-day discounts and surcharges.</param>
/// <param name="TotalPrice">What the client pays in UAH: the room rental plus the services.</param>
public sealed record BookingResponse(
    Guid Id,
    Guid RoomId,
    Guid ClientId,
    DateTimeOffset Start,
    DateTimeOffset End,
    int DurationMinutes,
    int AttendeeCount,
    BookingStatus Status,
    DateTimeOffset? CancelledAt,
    decimal RoomHourlyPrice,
    IReadOnlyList<BookedServiceResponse> Services,
    decimal RentalPrice,
    decimal TotalPrice)
{
    public static BookingResponse From(Booking booking, TimeZoneInfo venueTimeZone) => new(
        booking.Id,
        booking.RoomId,
        booking.ClientId,
        TimeZoneInfo.ConvertTime(booking.Slot.Start, venueTimeZone),
        TimeZoneInfo.ConvertTime(booking.Slot.End, venueTimeZone),
        (int)booking.Slot.Duration.TotalMinutes,
        booking.AttendeeCount,
        booking.Status,
        booking.CancelledAt is { } cancelledAt ? TimeZoneInfo.ConvertTime(cancelledAt, venueTimeZone) : null,
        booking.RoomHourlyPrice,
        BookedServiceResponse.From(booking.BookedServices),
        booking.RentalPrice,
        booking.TotalPrice);
}

/// <summary>
/// A service included in a booking, with its name and price in UAH as they were when the booking was made.
/// </summary>
public sealed record BookedServiceResponse(Guid ServiceId, string Name, decimal Price)
{
    public static IReadOnlyList<BookedServiceResponse> From(IEnumerable<BookedService> services) =>
    [
        .. services
            .OrderBy(service => service.Name, StringComparer.OrdinalIgnoreCase)
            .Select(service => new BookedServiceResponse(service.ServiceId, service.Name, service.Price)),
    ];
}
