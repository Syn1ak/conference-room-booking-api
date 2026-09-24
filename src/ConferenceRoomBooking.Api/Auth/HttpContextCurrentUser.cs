using System.Security.Claims;
using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Infrastructure.Authentication;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// <see cref="ICurrentUser"/> read from the claims of the request's validated access token.
/// </summary>
public sealed class HttpContextCurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid Id => Guid.Parse(RequiredClaim(JwtRegisteredClaimNames.Sub));

    public string Email => RequiredClaim(JwtRegisteredClaimNames.Email);

    public IReadOnlyList<string> Roles =>
    [
        .. Principal.FindAll(JwtAccessTokenGenerator.RoleClaimType).Select(claim => claim.Value),
    ];

    private ClaimsPrincipal Principal =>
        httpContextAccessor.HttpContext?.User is { Identity.IsAuthenticated: true } user
            ? user
            : throw new InvalidOperationException("The current request has no authenticated user.");

    private string RequiredClaim(string claimType) =>
        Principal.FindFirstValue(claimType)
        ?? throw new InvalidOperationException($"The access token has no '{claimType}' claim.");
}
