using ConferenceRoomBooking.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace ConferenceRoomBooking.Api.Common;

public static class ErrorResponseExtensions
{
    /// <summary>
    /// Converts an application <see cref="Error"/> into an RFC 7807 ProblemDetails response.
    /// Validation errors use the same shape as automatic model validation responses.
    /// </summary>
    public static ActionResult ErrorResponse(this ControllerBase controller, Error error) => error.Type switch
    {
        ErrorType.Validation => controller.ValidationProblem(ToModelState(error)),
        ErrorType.Unauthorized => controller.Problem(title: error.Description, statusCode: StatusCodes.Status401Unauthorized),
        _ => throw new ArgumentOutOfRangeException(nameof(error), error.Type, "Unsupported error type."),
    };

    private static ModelStateDictionary ToModelState(Error error)
    {
        var modelState = new ModelStateDictionary();
        var fieldErrors = error.FieldErrors ?? new Dictionary<string, string[]> { [string.Empty] = [error.Description] };

        foreach (var (field, messages) in fieldErrors)
        {
            foreach (var message in messages)
            {
                modelState.AddModelError(field, message);
            }
        }

        return modelState;
    }
}
