namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// Names of the authorization policies used on endpoints (see the access matrix in ADR 0001).
/// </summary>
public static class Policies
{
    /// <summary>Only Admins: managing rooms and services, viewing reports.</summary>
    public const string AdminOnly = nameof(AdminOnly);

    /// <summary>Only Clients: creating and managing their own bookings.</summary>
    public const string ClientOnly = nameof(ClientOnly);
}
