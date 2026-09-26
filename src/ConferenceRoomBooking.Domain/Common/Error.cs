namespace ConferenceRoomBooking.Domain.Common;

/// <summary>
/// Category of an expected failure. The API maps each category to an HTTP status code.
/// </summary>
public enum ErrorType
{
    /// <summary>The request is invalid, for example a weak password or an email that is already registered.</summary>
    Validation,

    /// <summary>The caller couldn't be authenticated, for example because of wrong credentials.</summary>
    Unauthorized,

    /// <summary>The request clashes with the current state, for example a room name that is already taken.</summary>
    Conflict,
}

/// <summary>
/// An expected failure of a use case: a stable code, a human-readable description,
/// and, for validation failures, the messages per input field.
/// </summary>
public sealed record Error(
    string Code,
    string Description,
    ErrorType Type,
    IReadOnlyDictionary<string, string[]>? FieldErrors = null)
{
    public static Error Validation(string code, string description, IReadOnlyDictionary<string, string[]>? fieldErrors = null) =>
        new(code, description, ErrorType.Validation, fieldErrors);

    public static Error Unauthorized(string code, string description) =>
        new(code, description, ErrorType.Unauthorized);

    public static Error Conflict(string code, string description) =>
        new(code, description, ErrorType.Conflict);
}
