using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Rooms;

/// <summary>
/// Expected failures when creating or changing a <see cref="Room"/>.
/// </summary>
public static class RoomErrors
{
    public static readonly Error NameRequired = FieldError(
        "Room.NameRequired", nameof(Room.Name), "The room name is required.");

    public static readonly Error NameTooLong = FieldError(
        "Room.NameTooLong", nameof(Room.Name), $"The room name can't be longer than {Room.NameMaxLength} characters.");

    public static readonly Error CapacityNotPositive = FieldError(
        "Room.CapacityNotPositive", nameof(Room.Capacity), "The capacity must be at least 1 person.");

    public static readonly Error HourlyPriceNegative = FieldError(
        "Room.HourlyPriceNegative", nameof(Room.HourlyPrice), "The hourly price can't be negative.");

    private static Error FieldError(string code, string field, string message) =>
        Error.Validation(code, message, new Dictionary<string, string[]> { [field] = [message] });
}
