using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.Api.Services;

/// <summary>
/// The catalog of services, such as a projector or Wi-Fi, that rooms can offer.
/// </summary>
[ApiController]
[Route("api/services")]
public sealed class ServicesController(ServiceCatalogService catalog) : ControllerBase
{
    /// <summary>
    /// Lists all services in the catalog, ordered by name.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<ServiceResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> List(CancellationToken cancellationToken)
    {
        var services = await catalog.ListAsync(cancellationToken);

        return Ok(services.Select(ServiceResponse.From).ToList());
    }

    /// <summary>
    /// Returns one service from the catalog.
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<ServiceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ServiceResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await catalog.GetAsync(id, cancellationToken);

        return result.IsSuccess ? Ok(ServiceResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }

    /// <summary>
    /// Adds a service to the catalog. Rooms don't offer it until an admin adds it to them.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Policies.AdminOnly)]
    [ProducesResponseType<ServiceResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ServiceResponse>> Create(ServiceRequest request, CancellationToken cancellationToken)
    {
        var result = await catalog.CreateAsync(request.Name, request.StandardPrice!.Value, cancellationToken);
        if (!result.IsSuccess)
        {
            return this.ErrorResponse(result.Error);
        }

        var service = ServiceResponse.From(result.Value);

        return CreatedAtAction(nameof(Get), new { id = service.Id }, service);
    }

    /// <summary>
    /// Changes a service's name or standard price. Rooms that already offer it keep the price they charge.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.AdminOnly)]
    [ProducesResponseType<ServiceResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ServiceResponse>> Update(
        Guid id, ServiceRequest request, CancellationToken cancellationToken)
    {
        var result = await catalog.UpdateAsync(id, request.Name, request.StandardPrice!.Value, cancellationToken);

        return result.IsSuccess ? Ok(ServiceResponse.From(result.Value)) : this.ErrorResponse(result.Error);
    }

    /// <summary>
    /// Deletes a service from the catalog. Refused while a room offers it or a booking includes it.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.AdminOnly)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await catalog.DeleteAsync(id, cancellationToken);

        return result.IsSuccess ? NoContent() : this.ErrorResponse(result.Error);
    }
}
