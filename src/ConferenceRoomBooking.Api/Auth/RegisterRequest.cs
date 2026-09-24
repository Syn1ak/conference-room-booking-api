using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// Details for creating a Client account. Password strength is checked by the account policy.
/// </summary>
public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(128)] string Password);
