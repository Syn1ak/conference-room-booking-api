using ConferenceRoomBooking.Application.Common;

namespace ConferenceRoomBooking.Application.Auth;

/// <summary>
/// Expected failures of the authentication use cases.
/// </summary>
public static class AuthErrors
{
    public static readonly Error EmailAlreadyRegistered = Error.Validation(
        "Auth.EmailAlreadyRegistered",
        "An account with this email already exists.",
        new Dictionary<string, string[]> { ["Email"] = ["An account with this email already exists."] });

    public static Error InvalidRegistration(IReadOnlyDictionary<string, string[]> fieldErrors) => Error.Validation(
        "Auth.InvalidRegistration",
        "The registration details are invalid.",
        fieldErrors);
}
