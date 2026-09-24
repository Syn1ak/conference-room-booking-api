namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// The newly created Client account.
/// </summary>
public sealed record RegisterResponse(Guid UserId, string Email);
