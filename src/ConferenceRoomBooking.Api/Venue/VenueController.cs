using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace ConferenceRoomBooking.Api.Venue;

/// <summary>
/// The venue whose rooms are booked.
/// </summary>
[ApiController]
[Route("api/venue")]
public sealed class VenueController(IOptions<VenueOptions> venueOptions) : ControllerBase
{
    /// <summary>
    /// Returns the rules every booking follows: the venue's time zone, opening hours, time step, minimum length, how
    /// far ahead bookings can be made, and the rental rates by time of day. They change only with a deployment, so
    /// the response may be cached for an hour.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    [ProducesResponseType<VenueResponse>(StatusCodes.Status200OK)]
    public ActionResult<VenueResponse> Get() => Ok(VenueResponse.Create(venueOptions.Value.TimeZone));
}
