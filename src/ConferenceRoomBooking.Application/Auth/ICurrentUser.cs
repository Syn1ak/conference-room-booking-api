namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// The authenticated user making the current request.
/// Use cases rely on it for ownership checks, such as "clients see only their own bookings".
/// </summary>
public interface ICurrentUser
{
    Guid Id { get; }

    string Email { get; }

    IReadOnlyList<string> Roles { get; }
}
