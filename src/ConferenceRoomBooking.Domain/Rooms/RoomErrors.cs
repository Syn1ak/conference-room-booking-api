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

    public static readonly Error HourlyPriceTooPrecise = FieldError(
        "Room.HourlyPriceTooPrecise",
        nameof(Room.HourlyPrice),
        $"The hourly price can have at most {Prices.DecimalPlaces} decimal places.");

    public static readonly Error ServiceAlreadyOffered = FieldError(
        "Room.ServiceAlreadyOffered", nameof(ServiceOffering.ServiceId), "The room already offers this service.");

    public static readonly Error ServiceNotOffered = FieldError(
        "Room.ServiceNotOffered", nameof(ServiceOffering.ServiceId), "The room doesn't offer this service.");

    public static readonly Error ServicePriceNegative = FieldError(
        "Room.ServicePriceNegative", nameof(ServiceOffering.Price), "The service price can't be negative.");

    public static readonly Error ServicePriceTooPrecise = FieldError(
        "Room.ServicePriceTooPrecise",
        nameof(ServiceOffering.Price),
        $"The service price can have at most {Prices.DecimalPlaces} decimal places.");

    private static Error FieldError(string code, string field, string message) =>
        Error.Validation(code, message, new Dictionary<string, string[]> { [field] = [message] });
}
