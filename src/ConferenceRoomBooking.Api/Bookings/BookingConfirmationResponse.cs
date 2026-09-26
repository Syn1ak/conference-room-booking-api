using ConferenceRoomBooking.Application.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.Api.Bookings;

/// <summary>
/// A booking that was just made, with the full breakdown of its price. The lines add up to the totals.
/// Times are in the venue's offset.
/// </summary>
/// <param name="Id">The booking's id.</param>
/// <param name="RoomId">The booked room.</param>
/// <param name="ClientId">The client who made the booking.</param>
/// <param name="Start">When the booking starts.</param>
/// <param name="End">When the booking ends.</param>
/// <param name="DurationMinutes">How long the booking lasts.</param>
/// <param name="AttendeeCount">How many people attend.</param>
/// <param name="RoomHourlyPrice">The room's base hourly price in UAH.</param>
/// <param name="RentalLines">The room rental, one line per time band the booking touches, in time order.</param>
/// <param name="Services">The chosen services, each charged once per booking.</param>
/// <param name="RentalPrice">The room rental in UAH: the sum of the rental lines.</param>
/// <param name="TotalPrice">What the client pays in UAH: the room rental plus the services.</param>
public sealed record BookingConfirmationResponse(
    Guid Id,
    Guid RoomId,
    Guid ClientId,
    DateTimeOffset Start,
    DateTimeOffset End,
    int DurationMinutes,
    int AttendeeCount,
    decimal RoomHourlyPrice,
    IReadOnlyList<RentalLineResponse> RentalLines,
    IReadOnlyList<BookedServiceResponse> Services,
    decimal RentalPrice,
    decimal TotalPrice)
{
    public static BookingConfirmationResponse From(BookingConfirmation confirmation, TimeZoneInfo venueTimeZone)
    {
        var booking = BookingResponse.From(confirmation.Booking, venueTimeZone);
        var price = confirmation.Price;

        return new BookingConfirmationResponse(
            booking.Id,
            booking.RoomId,
            booking.ClientId,
            booking.Start,
            booking.End,
            booking.DurationMinutes,
            booking.AttendeeCount,
            booking.RoomHourlyPrice,
            [.. price.RentalLines.Select(RentalLineResponse.From)],
            BookedServiceResponse.From(price.Services),
            price.RentalPrice,
            price.TotalPrice);
    }
}

/// <summary>
/// The part of the room rental that falls into one time band.
/// </summary>
/// <param name="Band">Morning, Standard, Peak, or Evening.</param>
/// <param name="Start">Where the part starts.</param>
/// <param name="End">Where the part ends.</param>
/// <param name="Hours">The length of the part in hours, which can be fractional.</param>
/// <param name="Multiplier">What the band multiplies the room's hourly price by, for example 1.15 at peak hours.</param>
/// <param name="Amount">Hours × hourly price × multiplier in UAH, rounded to kopiykas.</param>
public sealed record RentalLineResponse(
    TimeBandKind Band,
    DateTimeOffset Start,
    DateTimeOffset End,
    decimal Hours,
    decimal Multiplier,
    decimal Amount)
{
    public static RentalLineResponse From(RentalLine line) =>
        new(line.Band, line.Start, line.End, line.Hours, line.Multiplier, line.Amount);
}
