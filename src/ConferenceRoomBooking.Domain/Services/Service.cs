using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Services;

/// <summary>
/// A catalog entry for something rooms can offer, such as a projector or Wi-Fi,
/// with the standard price a room charges for it unless it sets its own.
/// </summary>
public sealed class Service
{
    public const int NameMaxLength = 100;

    private Service(Guid id, string name, decimal standardPrice)
    {
        Id = id;
        Name = name;
        StandardPrice = standardPrice;
    }

    public Guid Id { get; }

    public string Name { get; private set; }

    /// <summary>Price in UAH.</summary>
    public decimal StandardPrice { get; private set; }

    public static Result<Service> Create(string name, decimal standardPrice)
    {
        if (Validate(name, standardPrice) is { } error)
        {
            return error;
        }

        return new Service(Guid.CreateVersion7(), name.Trim(), standardPrice);
    }

    public Result Update(string name, decimal standardPrice)
    {
        if (Validate(name, standardPrice) is { } error)
        {
            return error;
        }

        Name = name.Trim();
        StandardPrice = standardPrice;
        return Result.Success;
    }

    private static Error? Validate(string name, decimal standardPrice)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return ServiceErrors.NameRequired;
        }

        if (name.Trim().Length > NameMaxLength)
        {
            return ServiceErrors.NameTooLong;
        }

        if (standardPrice < 0)
        {
            return ServiceErrors.StandardPriceNegative;
        }

        if (!Prices.IsInWholeKopiykas(standardPrice))
        {
            return ServiceErrors.StandardPriceTooPrecise;
        }

        return null;
    }
}
