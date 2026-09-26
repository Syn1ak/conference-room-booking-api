using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Services;

/// <summary>
/// Expected failures when creating or changing a catalog <see cref="Service"/>.
/// </summary>
public static class ServiceErrors
{
    public static readonly Error NameRequired = FieldError(
        "Service.NameRequired", nameof(Service.Name), "The service name is required.");

    public static readonly Error NameTooLong = FieldError(
        "Service.NameTooLong", nameof(Service.Name), $"The service name can't be longer than {Service.NameMaxLength} characters.");

    public static readonly Error NameTaken = Error.Conflict(
        "Service.NameTaken", "A service with this name already exists.");

    public static readonly Error NotFound = Error.NotFound(
        "Service.NotFound", "The service doesn't exist.");

    public static readonly Error InUse = Error.Conflict(
        "Service.InUse", "The service can't be deleted while a room offers it or a booking includes it.");

    public static readonly Error StandardPriceNegative = FieldError(
        "Service.StandardPriceNegative", nameof(Service.StandardPrice), "The standard price can't be negative.");

    public static readonly Error StandardPriceTooPrecise = FieldError(
        "Service.StandardPriceTooPrecise",
        nameof(Service.StandardPrice),
        $"The standard price can have at most {Prices.DecimalPlaces} decimal places.");

    private static Error FieldError(string code, string field, string message) =>
        Error.Validation(code, message, new Dictionary<string, string[]> { [field] = [message] });
}
