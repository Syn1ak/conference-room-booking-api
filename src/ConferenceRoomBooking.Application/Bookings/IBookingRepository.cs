using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Application.Bookings;

/// <summary>
/// Bookings with the services saved on them. Returned bookings are tracked, so changes to them are saved by
/// <see cref="Common.IUnitOfWork"/>.
/// </summary>
public interface IBookingRepository
{
    Task<Booking?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>The client's bookings, including cancelled ones, ordered by start time.</summary>
    Task<IReadOnlyList<Booking>> ListForClientAsync(Guid clientId, CancellationToken cancellationToken);

    /// <summary>All bookings, including cancelled ones, ordered by start time.</summary>
    Task<IReadOnlyList<Booking>> ListAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Whether a confirmed booking of the room overlaps <paramref name="slot"/>. Cancelled bookings don't count,
    /// and back-to-back slots don't overlap.
    /// </summary>
    Task<bool> HasOverlapAsync(Guid roomId, BookingSlot slot, CancellationToken cancellationToken);

    void Add(Booking booking);
}
