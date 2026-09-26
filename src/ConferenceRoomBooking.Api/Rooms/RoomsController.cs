using ConferenceRoomBooking.Api.Auth;
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

    /// <summary>
    /// Adds a room that offers the given catalog services, each at its own price or the service's standard price.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    [ProducesResponseType<RoomResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RoomResponse>> Create(RoomRequest request, CancellationToken cancellationToken)
    {
        var result = await roomService.CreateAsync(request.ToDetails(), cancellationToken);
        if (!result.IsSuccess)
        {
            return this.ErrorResponse(result.Error);
        }

        var room = RoomResponse.From(result.Value);

        return CreatedAtAction(nameof(Get), new { id = room.Id }, room);
    }

    /// <summary>
    /// Replaces a room's details and the full list of services it offers. Services left out of the list stop being
    /// offered. Existing bookings keep the prices they were made with.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.AdminOnly)]
    [ProducesResponseType<RoomResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RoomResponse>> Update(Guid id, RoomRequest request, CancellationToken cancellationToken)
    {
        var result = await roomService.UpdateAsync(id, request.ToDetails(), cancellationToken);

        return result.IsSuccess ? Ok(RoomResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }
}
