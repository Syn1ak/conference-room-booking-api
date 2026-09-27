using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// Accounts anyone may sign in with to try the app, listed on the sign-in page. Their passwords are public by design,
/// so they're configured only for demo deployments; none exist unless set.
/// </summary>
public sealed class DemoAccountsOptions
{
    public const string SectionName = "DemoAccounts";

    public IReadOnlyList<DemoAccount> Accounts { get; init; } = [];
}

/// <summary>A demo account: who it is, its public password, and its role.</summary>
public sealed class DemoAccount
{
    /// <summary>What the sign-in page calls it, for example "Client".</summary>
    [Required]
    public string Label { get; init; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;

    /// <summary>Admin or Client.</summary>
    [Required, RegularExpression("^(Admin|Client)$")]
    public string Role { get; init; } = string.Empty;
}
