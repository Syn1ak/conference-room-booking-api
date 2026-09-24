using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConferenceRoomBooking.Api.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService authService) : ControllerBase
{
    /// <summary>
    /// Creates a Client account. Admin accounts can't be created through the API.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType<RegisterResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterClientAsync(request.Email, request.Password, cancellationToken);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, new RegisterResponse(result.Value, request.Email))
            : this.ErrorResponse(result.Error);
    }
}
