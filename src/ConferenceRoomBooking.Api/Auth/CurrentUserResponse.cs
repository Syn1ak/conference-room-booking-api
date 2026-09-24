namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// The account the access token belongs to.
/// </summary>
public sealed record CurrentUserResponse(Guid UserId, string Email, IReadOnlyList<string> Roles);
