using System.ComponentModel.DataAnnotations;
using ConferenceRoomBooking.Application.Bookings;

namespace ConferenceRoomBooking.Api.Bookings;

/// <summary>
/// A room to book, for when, for how many people, and with which of the room's services.
/// The price is always calculated by the server.
/// </summary>
/// <param name="RoomId">The room to book.</param>
/// <param name="Start">
/// Start as ISO 8601 with a UTC offset, for example 2024-09-01T10:00:00+03:00. It must be in the future, on a
/// 15-minute step, and within opening hours (06:00–23:00 venue time).
/// </param>
/// <param name="End">End, in the same format, on the same day and at least 30 minutes after the start.</param>
/// <param name="AttendeeCount">How many people attend, at most the room's capacity.</param>
/// <param name="ServiceIds">Services the room offers to include, each charged once per booking. Leave it out for none.</param>
public sealed record CreateBookingRequest(
    [Required] Guid? RoomId,
    [Required] DateTimeOffset? Start,
    [Required] DateTimeOffset? End,
    [Required, Range(1, int.MaxValue)] int? AttendeeCount,
    IReadOnlyList<Guid>? ServiceIds)
{
    public NewBooking ToNewBooking() =>
        new(RoomId!.Value, Start!.Value, End!.Value, AttendeeCount!.Value, ServiceIds ?? []);
}
