namespace ConferenceRoomBooking.Api.RateLimiting;

/// <summary>
/// Names of the rate limiting policies applied to specific endpoints.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>Stricter limit for anonymous endpoints that accept credentials: register and login.</summary>
    public const string Authentication = nameof(Authentication);
}
