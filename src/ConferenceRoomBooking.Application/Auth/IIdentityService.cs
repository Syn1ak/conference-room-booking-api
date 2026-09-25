using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// User account operations backed by the identity store.
/// </summary>
public interface IIdentityService
{
    /// <summary>Creates a user with the given role and returns the new user's id.</summary>
    Task<Result<Guid>> CreateUserAsync(string email, string password, string role, CancellationToken cancellationToken);

    /// <summary>
    /// Verifies the email and password, counting failed attempts towards account lockout.
    /// Returns the account on success.
    /// </summary>
    Task<Result<UserAccount>> CheckCredentialsAsync(string email, string password);
}

/// <summary>
/// A user account as seen by the Application layer.
/// </summary>
public sealed record UserAccount(Guid Id, string Email, IReadOnlyList<string> Roles);
