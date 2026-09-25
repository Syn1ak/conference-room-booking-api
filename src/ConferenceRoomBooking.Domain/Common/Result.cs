using System.Diagnostics.CodeAnalysis;

namespace ConferenceRoomBooking.Domain.Common;

/// <summary>
/// The outcome of an operation that returns no value: either success or an <see cref="Common.Error"/>.
/// Expected failures are returned this way; exceptions are reserved for unexpected ones.
/// </summary>
public sealed class Result
{
    public static readonly Result Success = new(null);

    private Result(Error? error) => Error = error;

    [MemberNotNullWhen(false, nameof(Error))]
    public bool IsSuccess => Error is null;

    public Error? Error { get; }

    public static implicit operator Result(Error error) => new(error);
}

/// <summary>
/// The outcome of an operation: either a value or an <see cref="Common.Error"/>.
/// Expected failures are returned this way; exceptions are reserved for unexpected ones.
/// </summary>
public sealed class Result<TValue>
{
    private readonly TValue? _value;

    private Result(TValue value) => _value = value;

    private Result(Error error) => Error = error;

    [MemberNotNullWhen(false, nameof(Error))]
    public bool IsSuccess => Error is null;

    public Error? Error { get; }

    public TValue Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("A failed result has no value.");

    public static implicit operator Result<TValue>(TValue value) => new(value);

    public static implicit operator Result<TValue>(Error error) => new(error);
}
