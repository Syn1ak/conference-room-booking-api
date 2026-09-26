using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Application.Rooms;

/// <summary>
/// Conference rooms, loaded with the services they offer. Returned rooms are tracked, so changes to them are saved
/// by <see cref="Common.IUnitOfWork"/>.
/// </summary>
public interface IRoomRepository
{
    Task<Room?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>All rooms, ordered by name.</summary>
    Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Rooms that hold at least <paramref name="capacity"/> people and have no confirmed booking overlapping
    /// <paramref name="slot"/>, ordered by name.
    /// </summary>
    Task<IReadOnlyList<Room>> FindAvailableAsync(BookingSlot slot, int capacity, CancellationToken cancellationToken);

    /// <summary>
    /// Whether a room other than <paramref name="exceptId"/> has this name. Names are compared ignoring case.
    /// </summary>
    Task<bool> NameExistsAsync(string name, Guid? exceptId, CancellationToken cancellationToken);

    /// <summary>Whether the room has any bookings, including past and cancelled ones, which means it can't be deleted.</summary>
    Task<bool> HasBookingsAsync(Guid id, CancellationToken cancellationToken);

    void Add(Room room);

    void Remove(Room room);
}
