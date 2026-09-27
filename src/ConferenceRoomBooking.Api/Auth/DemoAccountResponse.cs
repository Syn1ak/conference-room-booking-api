namespace ConferenceRoomBooking.Api.Auth;

/// <summary>
/// An account anyone may sign in with to try the app. Its password is public by design.
/// </summary>
/// <param name="Label">What the sign-in page calls it, for example "Client".</param>
/// <param name="Email">The account's email.</param>
/// <param name="Password">The account's public password.</param>
/// <param name="Role">Admin or Client.</param>
public sealed record DemoAccountResponse(string Label, string Email, string Password, string Role);
