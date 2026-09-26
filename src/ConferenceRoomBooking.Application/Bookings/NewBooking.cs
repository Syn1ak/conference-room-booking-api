namespace ConferenceRoomBooking.Application.Bookings;

/// <summary>
/// What a client asks for when booking a room.
/// </summary>
public sealed record NewBooking(
    Guid RoomId,
    DateTimeOffset Start,
    DateTimeOffset End,
    int AttendeeCount,
    IReadOnlyCollection<Guid> ServiceIds);
