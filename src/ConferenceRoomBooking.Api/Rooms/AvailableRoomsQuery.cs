using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Api.Rooms;

/// <summary>
/// The time and headcount to find free rooms for.
/// </summary>
/// <param name="Start">
/// Start as ISO 8601 with a UTC offset, for example 2024-09-01T10:00:00+03:00 (send '+' as %2B) or 2024-09-01T07:00:00Z.
/// </param>
/// <param name="End">End, in the same format. The room must be free until then.</param>
/// <param name="Capacity">How many people the room must hold.</param>
public sealed record AvailableRoomsQuery(
    [Required] DateTimeOffset? Start,
    [Required] DateTimeOffset? End,
    [Required, Range(1, int.MaxValue)] int? Capacity);
