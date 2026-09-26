using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Bookings;

internal static class BookingQueries
{
    /// <summary>
    /// Confirmed bookings that overlap <paramref name="slot"/>, with the same rule as <see cref="BookingSlot.Overlaps"/>:
    /// the end is excluded, so back-to-back bookings don't overlap.
    /// </summary>
    public static IQueryable<Booking> ConfirmedOverlapping(this IQueryable<Booking> bookings, BookingSlot slot) =>
        bookings.Where(booking =>
            booking.Status == BookingStatus.Confirmed
            && booking.Slot.Start < slot.End
            && slot.Start < booking.Slot.End);
}
