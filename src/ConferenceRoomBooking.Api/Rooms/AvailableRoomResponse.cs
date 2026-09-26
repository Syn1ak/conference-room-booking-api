using ConferenceRoomBooking.Application.Rooms;

namespace ConferenceRoomBooking.Api.Rooms;

/// <summary>
/// A room that is free for the searched time.
/// </summary>
/// <param name="Id">The room's id.</param>
/// <param name="Name">Unique name, for example "Room A".</param>
/// <param name="Capacity">The maximum number of people the room holds.</param>
/// <param name="HourlyPrice">Base rental price per hour in UAH, before time-of-day discounts and surcharges.</param>
/// <param name="Services">The services a booking of this room can include, ordered by name.</param>
/// <param name="RentalPrice">
/// What renting the room for the searched time costs in UAH, with time-of-day discounts and surcharges, before services.
/// </param>
public sealed record AvailableRoomResponse(
    Guid Id,
    string Name,
    int Capacity,
    decimal HourlyPrice,
    IReadOnlyList<OfferedServiceResponse> Services,
    decimal RentalPrice)
{
    public static AvailableRoomResponse From(AvailableRoom availableRoom)
    {
        var room = RoomResponse.From(availableRoom.Room);

        return new AvailableRoomResponse(
            room.Id, room.Name, room.Capacity, room.HourlyPrice, room.Services, availableRoom.RentalPrice);
    }
}
