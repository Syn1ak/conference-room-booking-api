namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// Names of the roles a user can have (see ADR 0001).
/// </summary>
public static class Roles
{
    /// <summary>Company staff: manages rooms and services, views reports.</summary>
    public const string Admin = "Admin";

    /// <summary>Business customer: searches rooms and manages their own bookings.</summary>
    public const string Client = "Client";
}
