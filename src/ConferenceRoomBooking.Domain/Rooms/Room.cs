using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Domain.Rooms;

/// <summary>
/// A conference room that clients can book, with how many people it holds, its base rental price per hour,
/// and the services it offers.
/// </summary>
public sealed class Room
{
    public const int NameMaxLength = 100;

    private readonly List<ServiceOffering> _offerings = [];

    private Room(Guid id, string name, int capacity, decimal hourlyPrice)
    {
        Id = id;
        Name = name;
        Capacity = capacity;
        HourlyPrice = hourlyPrice;
    }

    public Guid Id { get; }

    public string Name { get; private set; }

    /// <summary>The maximum number of people the room holds.</summary>
    public int Capacity { get; private set; }

    /// <summary>Base rental price per hour in UAH, before time-of-day discounts and surcharges.</summary>
    public decimal HourlyPrice { get; private set; }

    /// <summary>The catalog services this room offers, each at most once.</summary>
    public IReadOnlyCollection<ServiceOffering> Offerings => _offerings;

    public static Result<Room> Create(string name, int capacity, decimal hourlyPrice)
    {
        if (Validate(name, capacity, hourlyPrice) is { } error)
        {
            return error;
        }

        return new Room(Guid.CreateVersion7(), name.Trim(), capacity, hourlyPrice);
    }

    public Result Update(string name, int capacity, decimal hourlyPrice)
    {
        if (Validate(name, capacity, hourlyPrice) is { } error)
        {
            return error;
        }

        Name = name.Trim();
        Capacity = capacity;
        HourlyPrice = hourlyPrice;
        return Result.Success;
    }

    /// <summary>
    /// Starts offering a catalog service in this room, at the given price or, if none is given, the service's standard price.
    /// </summary>
    public Result OfferService(Service service, decimal? price = null)
    {
        if (FindOffering(service.Id) is not null)
        {
            return RoomErrors.ServiceAlreadyOffered;
        }

        var offeringPrice = price ?? service.StandardPrice;
        if (offeringPrice < 0)
        {
            return RoomErrors.ServicePriceNegative;
        }

        _offerings.Add(new ServiceOffering(service, offeringPrice));
        return Result.Success;
    }

    public Result ChangeServicePrice(Guid serviceId, decimal price)
    {
        if (FindOffering(serviceId) is not { } offering)
        {
            return RoomErrors.ServiceNotOffered;
        }

        if (price < 0)
        {
            return RoomErrors.ServicePriceNegative;
        }

        offering.ChangePrice(price);
        return Result.Success;
    }

    public Result StopOfferingService(Guid serviceId)
    {
        if (FindOffering(serviceId) is not { } offering)
        {
            return RoomErrors.ServiceNotOffered;
        }

        _offerings.Remove(offering);
        return Result.Success;
    }

    private ServiceOffering? FindOffering(Guid serviceId) =>
        _offerings.Find(offering => offering.ServiceId == serviceId);

    private static Error? Validate(string name, int capacity, decimal hourlyPrice)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return RoomErrors.NameRequired;
        }

        if (name.Trim().Length > NameMaxLength)
        {
            return RoomErrors.NameTooLong;
        }

        if (capacity <= 0)
        {
            return RoomErrors.CapacityNotPositive;
        }

        if (hourlyPrice < 0)
        {
            return RoomErrors.HourlyPriceNegative;
        }

        return null;
    }
}
