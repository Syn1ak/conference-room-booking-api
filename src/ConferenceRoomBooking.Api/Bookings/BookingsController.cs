using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Application.Bookings;
using ConferenceRoomBooking.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.Api.Bookings;

/// <summary>
/// Bookings: clients book rooms and manage their own bookings; admins see all bookings.
/// </summary>
[ApiController]
[Route("api/bookings")]
public sealed class BookingsController(BookingService bookingService, VenueTimeZone venueTimeZone) : ControllerBase
{
    /// <summary>
    /// Books a room for the signed-in client and returns the booking with its full price breakdown.
    /// The room rental is charged pro rata by time band; each chosen service once per booking.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Policies.ClientOnly)]
    [ProducesResponseType<BookingConfirmationResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingConfirmationResponse>> Create(
        CreateBookingRequest request, CancellationToken cancellationToken)
    {
        var result = await bookingService.CreateAsync(request.ToNewBooking(), cancellationToken);
        if (!result.IsSuccess)
        {
            return this.ErrorResponse(result.Error);
        }

        var confirmation = BookingConfirmationResponse.From(result.Value, venueTimeZone.TimeZone);

        return CreatedAtAction(nameof(Get), new { id = confirmation.Id }, confirmation);
    }

    /// <summary>
    /// Returns a booking. Clients can read only their own bookings; admins can read any.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<BookingResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await bookingService.GetAsync(id, cancellationToken);

        return result.IsSuccess
            ? Ok(BookingResponse.From(result.Value, venueTimeZone.TimeZone))
            : this.ErrorResponse(result.Error);
    }
}
