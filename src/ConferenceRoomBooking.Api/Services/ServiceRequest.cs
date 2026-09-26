using System.ComponentModel.DataAnnotations;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Api.Services;

/// <summary>
/// A catalog service to add, or the new details of an existing one.
/// </summary>
/// <param name="Name">Unique name, for example "Projector". Compared ignoring case.</param>
/// <param name="StandardPrice">Price in UAH that rooms charge unless they set their own, with at most 2 decimal places.</param>
public sealed record ServiceRequest(
    [Required, MaxLength(Service.NameMaxLength)] string Name,
    [Required, Range(0, RequestLimits.MaxPrice)] decimal? StandardPrice);
