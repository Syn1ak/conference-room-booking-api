using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Rooms;

/// <summary>
/// A conference room that clients can book, with how many people it holds and its base rental price per hour.
/// </summary>
public sealed class Room
{
    public const int NameMaxLength = 100;

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
