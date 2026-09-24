namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// An access token to send as <c>Authorization: Bearer {AccessToken}</c> until it expires.
/// </summary>
public sealed record LoginResponse(string AccessToken, string TokenType, DateTimeOffset ExpiresAt);
