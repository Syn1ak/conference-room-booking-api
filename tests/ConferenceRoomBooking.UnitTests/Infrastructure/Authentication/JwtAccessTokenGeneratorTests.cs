using System.Text;
using ConferenceRoomBooking.Infrastructure.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ConferenceRoomBooking.UnitTests.Infrastructure.Authentication;

public sealed class JwtAccessTokenGeneratorTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 1, 10, 0, 0, TimeSpan.Zero);
    private static readonly Guid UserId = Guid.Parse("7b0d7f5e-3c1a-4c55-9d8e-2f6a1b3c4d5e");
    private const string Email = "client@example.com";

    private static readonly JwtOptions JwtSettings = new()
    {
        Issuer = "test-issuer",
        Audience = "test-audience",
        SigningKey = "test-signing-key-that-is-at-least-32-characters-long",
        LifetimeMinutes = 60,
    };

    private readonly JwtAccessTokenGenerator _generator =
        new(Options.Create(JwtSettings), new FakeTimeProvider(Now));

    [Fact]
    public void Generate_IncludesUserIdEmailAndRoles()
    {
        var token = Read(_generator.Generate(UserId, Email, ["Admin", "Client"]).Value);

        Assert.Equal(UserId.ToString(), token.Subject);
        Assert.Equal(Email, token.GetClaim(JwtRegisteredClaimNames.Email).Value);
        Assert.Equal(
            ["Admin", "Client"],
            token.Claims.Where(claim => claim.Type == JwtAccessTokenGenerator.RoleClaimType).Select(claim => claim.Value));
    }

    [Fact]
    public void Generate_SetsConfiguredIssuerAndAudience()
    {
        var token = Read(_generator.Generate(UserId, Email, ["Client"]).Value);

        Assert.Equal(JwtSettings.Issuer, token.Issuer);
        Assert.Equal([JwtSettings.Audience], token.Audiences);
    }

    [Fact]
    public void Generate_ExpiresAfterConfiguredLifetime()
    {
        var accessToken = _generator.Generate(UserId, Email, ["Client"]);
        var token = Read(accessToken.Value);

        var expectedExpiry = Now.AddMinutes(JwtSettings.LifetimeMinutes);
        Assert.Equal(expectedExpiry, accessToken.ExpiresAt);
        Assert.Equal(Now.UtcDateTime, token.IssuedAt);
        Assert.Equal(expectedExpiry.UtcDateTime, token.ValidTo);
    }

    [Fact]
    public void Generate_GivesEveryTokenAUniqueId()
    {
        var first = Read(_generator.Generate(UserId, Email, ["Client"]).Value);
        var second = Read(_generator.Generate(UserId, Email, ["Client"]).Value);

        Assert.NotEqual(first.Id, second.Id);
    }

    [Fact]
    public async Task Generate_SignsWithConfiguredKey()
    {
        var token = _generator.Generate(UserId, Email, ["Client"]).Value;

        var result = await ValidateSignatureAsync(token, JwtSettings.SigningKey);

        Assert.True(result.IsValid, result.Exception?.Message);
        Assert.Equal(SecurityAlgorithms.HmacSha256, ((JsonWebToken)result.SecurityToken).Alg);
    }

    [Fact]
    public async Task Generate_TokenIsRejectedWithADifferentKey()
    {
        var token = _generator.Generate(UserId, Email, ["Client"]).Value;

        var result = await ValidateSignatureAsync(token, "a-different-signing-key-of-at-least-32-characters");

        Assert.False(result.IsValid);
        Assert.IsType<SecurityTokenSignatureKeyNotFoundException>(result.Exception);
    }

    private static JsonWebToken Read(string token) => new(token);

    /// <summary>Checks only the signature; lifetime is ignored because the fake clock is in the past.</summary>
    private static Task<TokenValidationResult> ValidateSignatureAsync(string token, string signingKey) =>
        new JsonWebTokenHandler().ValidateTokenAsync(token, new TokenValidationParameters
        {
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateIssuerSigningKey = true,
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = false,
        });
}
