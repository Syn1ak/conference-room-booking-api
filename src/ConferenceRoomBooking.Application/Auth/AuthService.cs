using ConferenceRoomBooking.Application.Common;

namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// Authentication use cases: registering and logging in.
/// </summary>
public sealed class AuthService(IIdentityService identityService, IAccessTokenGenerator accessTokenGenerator)
{
    /// <summary>
    /// Registers a new Client account. Public registration never creates Admins.
    /// </summary>
    public Task<Result<Guid>> RegisterClientAsync(string email, string password, CancellationToken cancellationToken) =>
        identityService.CreateUserAsync(email, password, Roles.Client, cancellationToken);

    /// <summary>
    /// Checks the credentials and issues an access token for the account.
    /// </summary>
    public async Task<Result<AccessToken>> LoginAsync(string email, string password)
    {
        var result = await identityService.CheckCredentialsAsync(email, password);
        if (!result.IsSuccess)
        {
            return result.Error;
        }

        var account = result.Value;

        return accessTokenGenerator.Generate(account.Id, account.Email, account.Roles);
    }
}
