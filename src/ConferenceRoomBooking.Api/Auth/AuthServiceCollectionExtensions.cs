using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace ConferenceRoomBooking.Api.Auth;

public static class AuthServiceCollectionExtensions
{
    /// <summary>
    /// Authenticates requests with JWT bearer tokens issued by <see cref="JwtAccessTokenGenerator"/>.
    /// </summary>
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services)
    {
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        // Validate tokens with the same (startup-validated) settings that are used to issue them.
        services
            .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>, IHostEnvironment>((bearerOptions, jwtOptions, environment) =>
            {
                var jwt = jwtOptions.Value;

                // Say why a token was rejected (e.g. "signature key was not found") only in Development.
                bearerOptions.IncludeErrorDetails = environment.IsDevelopment();

                // Keep claim names as they appear in the token ("sub", "email", "role").
                bearerOptions.MapInboundClaims = false;

                bearerOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = jwt.CreateSigningKey(),
                    // Accept only the algorithm tokens are signed with.
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = JwtRegisteredClaimNames.Sub,
                    RoleClaimType = JwtAccessTokenGenerator.RoleClaimType,
                };
            });

        return services;
    }

    /// <summary>
    /// Makes the authenticated user of the current request available to use cases as <see cref="ICurrentUser"/>.
    /// </summary>
    public static IServiceCollection AddCurrentUser(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpContextCurrentUser>();

        return services;
    }

    /// <summary>
    /// Registers the role-based policies and makes every endpoint require an authenticated user
    /// unless it explicitly allows anonymous access.
    /// </summary>
    public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services
            .AddAuthorizationBuilder()
            .AddPolicy(Policies.AdminOnly, policy => policy.RequireRole(Roles.Admin))
            .AddPolicy(Policies.ClientOnly, policy => policy.RequireRole(Roles.Client))
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        return services;
    }
}
