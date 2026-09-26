using System.ComponentModel.DataAnnotations;
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
    /// Lists the bookings the caller may see, including cancelled ones, latest start first: a client gets their own
    /// bookings, an admin gets every client's.
    /// </summary>
    /// <param name="page">The page number, starting at 1.</param>
    /// <param name="pageSize">How many bookings a page holds, at most 100.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [HttpGet]
    [ProducesResponseType<PageResponse<BookingResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PageResponse<BookingResponse>>> List(
        [FromQuery, Range(1, Paging.MaxPage)] int page = 1,
        [FromQuery, Range(1, Paging.MaxPageSize)] int pageSize = Paging.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var bookings = await bookingService.ListAsync(page, pageSize, cancellationToken);

        return Ok(PageResponse<BookingResponse>.From(
            bookings, booking => BookingResponse.From(booking, venueTimeZone.TimeZone)));
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

    /// <summary>
    /// Cancels one of the signed-in client's bookings before it starts, which frees its time slot. The booking is
    /// kept, with its status set to Cancelled.
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = Policies.ClientOnly)]
    [ProducesResponseType<BookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingResponse>> Cancel(Guid id, CancellationToken cancellationToken)
    {
        var result = await bookingService.CancelAsync(id, cancellationToken);

        return result.IsSuccess
            ? Ok(BookingResponse.From(result.Value, venueTimeZone.TimeZone))
            : this.ErrorResponse(result.Error);
    }
}
