using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// Credentials for logging in.
/// </summary>
public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(128)] string Password);
