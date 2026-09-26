using ConferenceRoomBooking.Domain.Common;
using Microsoft.Extensions.Logging;

namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// Authentication use cases: registering and logging in.
/// </summary>
public sealed class AuthService(
    IIdentityService identityService,
    IAccessTokenGenerator accessTokenGenerator,
    ILogger<AuthService> logger)
{
    /// <summary>
    /// Registers a new Client account. Public registration never creates Admins.
    /// </summary>
    public async Task<Result<Guid>> RegisterClientAsync(string email, string password, CancellationToken cancellationToken)
    {
        var result = await identityService.CreateUserAsync(email, password, Roles.Client, cancellationToken);
        if (result.IsSuccess)
        {
            logger.LogInformation("Client {UserId} registered", result.Value);
        }

        return result;
    }

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
