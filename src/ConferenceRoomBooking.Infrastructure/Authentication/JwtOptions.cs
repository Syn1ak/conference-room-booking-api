using System.ComponentModel.DataAnnotations;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace ConferenceRoomBooking.Infrastructure.Authentication;

/// <summary>
/// Settings for issuing and validating JWT access tokens.
/// The signing key is a secret: set it in user-secrets locally or in the App Service settings in Azure.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; init; } = string.Empty;

    [Required]
    public string Audience { get; init; } = string.Empty;

    /// <summary>HMAC-SHA256 key. At least 32 characters, so the key is at least 256 bits long.</summary>
    [Required, MinLength(32)]
    public string SigningKey { get; init; } = string.Empty;

    [Range(1, 1440)]
    public int LifetimeMinutes { get; init; } = 60;

    /// <summary>The key used both to sign tokens and to verify their signature.</summary>
    public SymmetricSecurityKey CreateSigningKey() => new(Encoding.UTF8.GetBytes(SigningKey));
}
