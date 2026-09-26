using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Application.Rooms;

/// <summary>
/// Use cases for conference rooms and the services they offer.
/// </summary>
public sealed class RoomService(IRoomRepository rooms)
{
    public Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken) =>
        rooms.ListAsync(cancellationToken);

    public async Task<Result<Room>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        await rooms.GetByIdAsync(id, cancellationToken) is { } room ? room : RoomErrors.NotFound;
}
