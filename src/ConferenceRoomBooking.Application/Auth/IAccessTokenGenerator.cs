namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// Issues access tokens that authenticate a user's requests to the API.
/// </summary>
public interface IAccessTokenGenerator
{
    AccessToken Generate(Guid userId, string email, IEnumerable<string> roles);
}

/// <summary>
/// A signed access token and the moment it stops being valid.
/// </summary>
public sealed record AccessToken(string Value, DateTimeOffset ExpiresAt);
