using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Api.RateLimiting;

/// <summary>
/// Request limits per client, each over a fixed time window.
/// </summary>
public sealed class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    /// <summary>Requests a client may make to any endpoint per window.</summary>
    [Range(1, int.MaxValue)]
    public int GlobalPermitLimit { get; init; } = 100;

    /// <summary>Requests a client may make to register and login per window. Kept low to slow down password guessing.</summary>
    [Range(1, int.MaxValue)]
    public int AuthenticationPermitLimit { get; init; } = 10;

    [Range(1, 3600)]
    public int WindowSeconds { get; init; } = 60;
}
