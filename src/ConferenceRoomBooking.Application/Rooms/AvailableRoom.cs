using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Application.Rooms;

/// <summary>
/// A room that is free for the searched time, with what renting it for that time costs in UAH, before services.
/// </summary>
public sealed record AvailableRoom(Room Room, decimal RentalPrice);
