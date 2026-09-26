using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Application.Common;

/// <summary>
/// Saves the changes a use case made through the repositories, all together.
/// </summary>
public interface IUnitOfWork
{
    /// <summary>
    /// Saves all pending changes. Returns a conflict if the database rejects a name that another request took
    /// in the meantime; other database failures are thrown.
    /// </summary>
    Task<Result> SaveChangesAsync(CancellationToken cancellationToken);
}
