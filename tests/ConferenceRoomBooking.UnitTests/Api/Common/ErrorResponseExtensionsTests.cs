using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Domain.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.UnitTests.Api.Common;

public sealed class ErrorResponseExtensionsTests
{
    private static readonly IServiceProvider MvcServices =
        new ServiceCollection().AddLogging().AddMvcCore().Services.BuildServiceProvider();

    private readonly TestController _controller = new()
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { RequestServices = MvcServices },
        },
    };

    [Fact]
    public void ErrorResponse_ForConflict_Returns409ProblemDetails()
    {
        var error = Error.Conflict("Room.NameTaken", "A room with this name already exists.");

        var result = Assert.IsType<ObjectResult>(_controller.ErrorResponse(error));

        Assert.Equal(StatusCodes.Status409Conflict, result.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal((409, "A room with this name already exists."), (problem.Status, problem.Title));
    }

    [Fact]
    public void ErrorResponse_ForNotFound_Returns404ProblemDetails()
    {
        var error = Error.NotFound("Room.NotFound", "The room doesn't exist.");

        var result = Assert.IsType<ObjectResult>(_controller.ErrorResponse(error));

        Assert.Equal(StatusCodes.Status404NotFound, result.StatusCode);
        var problem = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal((404, "The room doesn't exist."), (problem.Status, problem.Title));
    }

    private sealed class TestController : ControllerBase;
}
