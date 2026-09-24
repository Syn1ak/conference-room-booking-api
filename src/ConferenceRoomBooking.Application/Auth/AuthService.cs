using ConferenceRoomBooking.Application.Common;

namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// Authentication use cases: registering and logging in.
/// </summary>
public sealed class AuthService(IIdentityService identityService)
{
    /// <summary>
    /// Registers a new Client account. Public registration never creates Admins.
    /// </summary>
    public Task<Result<Guid>> RegisterClientAsync(string email, string password, CancellationToken cancellationToken) =>
        identityService.CreateUserAsync(email, password, Roles.Client, cancellationToken);
}
