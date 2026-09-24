using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// Credentials of the first Admin account, created at startup.
/// Set them in user-secrets locally or in the App Service settings in Azure, never in source code.
/// </summary>
public sealed class AdminAccountOptions
{
    public const string SectionName = "AdminAccount";

    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}
