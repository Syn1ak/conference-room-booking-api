using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Domain.Bookings;

namespace ConferenceRoomBooking.Application.Bookings;

/// <summary>
/// Bookings with the services saved on them. Returned bookings are tracked, so changes to them are saved by
/// <see cref="Common.IUnitOfWork"/>.
/// </summary>
public interface IBookingRepository
{
    Task<Booking?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// A page of the client's bookings, including cancelled ones, latest start first.
    /// <paramref name="pageNumber"/> starts at 1.
    /// </summary>
    Task<Page<Booking>> ListForClientAsync(
        Guid clientId, int pageNumber, int pageSize, CancellationToken cancellationToken);

    /// <summary>
    /// A page of all bookings, including cancelled ones, latest start first. <paramref name="pageNumber"/> starts at 1.
    /// </summary>
    Task<Page<Booking>> ListAsync(int pageNumber, int pageSize, CancellationToken cancellationToken);

    /// <summary>
    /// Whether a confirmed booking of the room overlaps <paramref name="slot"/>. Cancelled bookings don't count,
    /// and back-to-back slots don't overlap.
    /// </summary>
    Task<bool> HasOverlapAsync(Guid roomId, BookingSlot slot, CancellationToken cancellationToken);

    void Add(Booking booking);
}
