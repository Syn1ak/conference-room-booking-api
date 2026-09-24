using System.Security.Claims;
using ConferenceRoomBooking.Application.Auth;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ConferenceRoomBooking.Infrastructure.Authentication;

/// <summary>
/// Issues HMAC-SHA256 signed JWTs carrying the user's id, email, and roles.
/// </summary>
public sealed class JwtAccessTokenGenerator(IOptions<JwtOptions> options, TimeProvider timeProvider) : IAccessTokenGenerator
{
    /// <summary>Claim type used for roles; token validation must read roles from the same claim.</summary>
    public const string RoleClaimType = "role";

    private readonly JsonWebTokenHandler _tokenHandler = new();

    public AccessToken Generate(Guid userId, string email, IEnumerable<string> roles)
    {
        var jwtOptions = options.Value;
        var issuedAt = timeProvider.GetUtcNow();
        var expiresAt = issuedAt.AddMinutes(jwtOptions.LifetimeMinutes);

        List<Claim> claims =
        [
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            .. roles.Select(role => new Claim(RoleClaimType, role)),
        ];

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = jwtOptions.Issuer,
            Audience = jwtOptions.Audience,
            Subject = new ClaimsIdentity(claims),
            IssuedAt = issuedAt.UtcDateTime,
            NotBefore = issuedAt.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(jwtOptions.CreateSigningKey(), SecurityAlgorithms.HmacSha256),
        };

        return new AccessToken(_tokenHandler.CreateToken(descriptor), expiresAt);
    }
}
