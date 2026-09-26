using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Api.Rooms;

/// <summary>
/// A conference room with the services it offers.
/// </summary>
/// <param name="Id">The room's id.</param>
/// <param name="Name">Unique name, for example "Room A".</param>
/// <param name="Capacity">The maximum number of people the room holds.</param>
/// <param name="HourlyPrice">Base rental price per hour in UAH, before time-of-day discounts and surcharges.</param>
/// <param name="Services">The services a booking of this room can include, ordered by name.</param>
public sealed record RoomResponse(
    Guid Id,
    string Name,
    int Capacity,
    decimal HourlyPrice,
    IReadOnlyList<OfferedServiceResponse> Services)
{
    public static RoomResponse From(Room room) => new(
        room.Id,
        room.Name,
        room.Capacity,
        room.HourlyPrice,
        [
            .. room.Offerings
                .OrderBy(offering => offering.Service.Name, StringComparer.OrdinalIgnoreCase)
                .Select(offering => new OfferedServiceResponse(offering.ServiceId, offering.Service.Name, offering.Price)),
        ]);
}

/// <summary>
/// A catalog service a room offers, at the price in UAH this room charges for it, once per booking.
/// </summary>
public sealed record OfferedServiceResponse(Guid ServiceId, string Name, decimal Price);
