using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Application.Rooms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.Api.Rooms;

/// <summary>
/// Conference rooms: browsing them, searching for free ones, and managing them.
/// </summary>
[ApiController]
[Route("api/rooms")]
public sealed class RoomsController(RoomService roomService) : ControllerBase
{
    /// <summary>
    /// Lists all rooms with the services they offer, ordered by name.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<RoomResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RoomResponse>>> List(CancellationToken cancellationToken)
    {
        var rooms = await roomService.ListAsync(cancellationToken);

        return Ok(rooms.Select(RoomResponse.From).ToList());
    }

    /// <summary>
    /// Returns one room with the services it offers.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<RoomResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RoomResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await roomService.GetAsync(id, cancellationToken);

        return result.IsSuccess ? Ok(RoomResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }
}
