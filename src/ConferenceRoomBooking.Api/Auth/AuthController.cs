using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Api.RateLimiting;
using ConferenceRoomBooking.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using ConferenceRoomBooking.Infrastructure.Identity;

namespace ConferenceRoomBooking.Api.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    AuthService authService, ICurrentUser currentUser, IOptions<DemoAccountsOptions> demoAccounts) : ControllerBase
{
    /// <summary>
    /// Creates a Client account. Admin accounts can't be created through the API.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Authentication)]
    [ProducesResponseType<RegisterResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterClientAsync(request.Email, request.Password, cancellationToken);

        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, new RegisterResponse(result.Value, request.Email))
            : this.ErrorResponse(result.Error);
    }

    /// <summary>
    /// Exchanges an email and password for an access token.
    /// Repeated failures lock the account for a while.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Authentication)]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var result = await authService.LoginAsync(request.Email, request.Password);
        if (!result.IsSuccess)
        {
            return this.ErrorResponse(result.Error);
        }

        var accessToken = result.Value;

        return Ok(new LoginResponse(accessToken.Value, "Bearer", accessToken.ExpiresAt));
    }

    /// <summary>
    /// Lists the demo accounts anyone may sign in with to try the app, with their public passwords. Empty unless the
    /// deployment configures some.
    /// </summary>
    [HttpGet("demo-accounts")]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<DemoAccountResponse>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<DemoAccountResponse>> DemoAccounts() =>
        Ok(demoAccounts.Value.Accounts
            .Select(account => new DemoAccountResponse(account.Label, account.Email, account.Password, account.Role))
            .ToList());

    /// <summary>
    /// Returns the account the access token belongs to.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<CurrentUserResponse> Me() =>
        Ok(new CurrentUserResponse(currentUser.Id, currentUser.Email, currentUser.Roles));
}
