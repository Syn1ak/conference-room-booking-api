using System.ComponentModel.DataAnnotations;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Application.Rooms;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Api.Rooms;

/// <summary>
/// A room to add, or the complete new state of an existing one.
/// </summary>
/// <param name="Name">Unique name, for example "Room A". Compared ignoring case.</param>
/// <param name="Capacity">The maximum number of people the room holds, at least 1.</param>
/// <param name="HourlyPrice">Base rental price per hour in UAH, with at most 2 decimal places.</param>
/// <param name="Services">
/// Every catalog service the room offers; an empty list means none. On an edit, services left out stop being offered.
/// </param>
public sealed record RoomRequest(
    [Required, MaxLength(Room.NameMaxLength)] string Name,
    [Required] int? Capacity,
    [Required, Range(0, RequestLimits.MaxPrice)] decimal? HourlyPrice,
    [Required] IReadOnlyList<OfferedServiceRequest> Services)
{
    public RoomDetails ToDetails() => new(
        Name,
        Capacity!.Value,
        HourlyPrice!.Value,
        [.. Services.Select(service => new OfferedService(service.ServiceId!.Value, service.Price))]);
}

/// <summary>
/// A catalog service the room offers.
/// </summary>
/// <param name="ServiceId">The id of a service in the catalog.</param>
/// <param name="Price">Price in UAH in this room. Leave it out to use the service's standard price.</param>
public sealed record OfferedServiceRequest(
    [Required] Guid? ServiceId,
    [Range(0, RequestLimits.MaxPrice)] decimal? Price);
