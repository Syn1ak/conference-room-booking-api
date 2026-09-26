namespace ConferenceRoomBooking.Application.Rooms;

/// <summary>
/// Everything an admin sets on a room: its details and the full list of services it offers.
/// </summary>
public sealed record RoomDetails(string Name, int Capacity, decimal HourlyPrice, IReadOnlyList<OfferedService> Services);

/// <summary>
/// A catalog service a room offers, at <paramref name="Price"/> or, if none is given, the service's standard price.
/// </summary>
public sealed record OfferedService(Guid ServiceId, decimal? Price);
