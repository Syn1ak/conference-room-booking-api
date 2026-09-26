using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Application.Bookings;

/// <summary>
/// Lets only one request at a time book a given room, so that checking for overlapping bookings and saving the new
/// booking can't interleave with another request for the same room. Requests for other rooms don't wait.
/// </summary>
public interface IRoomBookingLock
{
    /// <summary>
    /// Runs <paramref name="action"/> while holding the room's lock, in one database transaction shared with the
    /// repositories and <see cref="Common.IUnitOfWork"/>. The transaction is committed if the action succeeds and
    /// rolled back if it returns a failure. The action may run again after a transient database failure, so it
    /// should do all of its reads and writes itself.
    /// </summary>
    Task<Result<TValue>> RunExclusiveAsync<TValue>(
        Guid roomId,
        Func<CancellationToken, Task<Result<TValue>>> action,
        CancellationToken cancellationToken);
}
