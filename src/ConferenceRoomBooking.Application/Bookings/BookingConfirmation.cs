using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Pricing;

namespace ConferenceRoomBooking.Application.Bookings;

/// <summary>
/// A booking that was just made, with the full breakdown of its price. Only the totals are saved with the booking.
/// </summary>
public sealed record BookingConfirmation(Booking Booking, PriceBreakdown Price);
