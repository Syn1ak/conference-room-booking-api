using ConferenceRoomBooking.Application.Common;

namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// User account operations backed by the identity store.
/// </summary>
public interface IIdentityService
{
    /// <summary>Creates a user with the given role and returns the new user's id.</summary>
    Task<Result<Guid>> CreateUserAsync(string email, string password, string role, CancellationToken cancellationToken);
}
