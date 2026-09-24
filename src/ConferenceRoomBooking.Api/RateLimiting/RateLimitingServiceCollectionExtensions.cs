using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;

namespace ConferenceRoomBooking.Api.RateLimiting;

public static class RateLimitingServiceCollectionExtensions
{
    /// <summary>
    /// Limits how many requests each client can make: a general limit on every endpoint,
    /// and a stricter one on the <see cref="RateLimitPolicies.Authentication"/> endpoints.
    /// Rejected requests get 429 Too Many Requests with a Retry-After header.
    /// </summary>
    public static IServiceCollection AddApiRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<RateLimitingOptions>()
            .Bind(configuration.GetSection(RateLimitingOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, _) =>
            {
                var problem = new ProblemDetails
                {
                    Status = StatusCodes.Status429TooManyRequests,
                    Title = "Too many requests.",
                };

                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    var seconds = (int)Math.Ceiling(retryAfter.TotalSeconds);
                    context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                    problem.Detail = $"Try again in {seconds} seconds.";
                }

                var problemDetailsService = context.HttpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
                await problemDetailsService.WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context.HttpContext,
                    ProblemDetails = problem,
                });
            };
        });

        // Configured through options so the limits come from the fully built configuration.
        services
            .AddOptions<RateLimiterOptions>()
            .Configure<IOptions<RateLimitingOptions>>((options, rateLimiting) =>
            {
                var limits = rateLimiting.Value;
                var window = TimeSpan.FromSeconds(limits.WindowSeconds);

                options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
                    FixedWindow(ClientKey(httpContext), limits.GlobalPermitLimit, window));

                // Always per IP address: callers of these endpoints aren't authenticated yet.
                options.AddPolicy(RateLimitPolicies.Authentication, httpContext =>
                    FixedWindow(IpAddressKey(httpContext), limits.AuthenticationPermitLimit, window));
            });

        return services;
    }

    private static RateLimitPartition<string> FixedWindow(string partitionKey, int permitLimit, TimeSpan window) =>
        RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window,
            QueueLimit = 0,
        });

    /// <summary>Authenticated users are limited per account, everyone else per IP address.</summary>
    private static string ClientKey(HttpContext httpContext) =>
        httpContext.User.FindFirstValue(JwtRegisteredClaimNames.Sub) is { } userId
            ? $"user:{userId}"
            : IpAddressKey(httpContext);

    private static string IpAddressKey(HttpContext httpContext) =>
        $"ip:{httpContext.Connection.RemoteIpAddress}";
}
