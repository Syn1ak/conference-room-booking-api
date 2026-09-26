using System.Globalization;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace ConferenceRoomBooking.Api.Common;

/// <summary>
/// Binds <see cref="DateTimeOffset"/> values from the route or query string, and rejects times without a UTC offset.
/// Without this, "2024-09-01T10:00:00" would be read in the server's own time zone, which is UTC on Azure.
/// </summary>
public sealed class OffsetRequiredDateTimeOffsetBinder : IModelBinder
{
    public const string MissingOffsetMessage =
        "The time must include a UTC offset, for example 2024-09-01T10:00:00+03:00 or 2024-09-01T07:00:00Z.";

    public const string InvalidMessage =
        "The value isn't a valid ISO 8601 time with a UTC offset, for example 2024-09-01T10:00:00+03:00. " +
        "In a query string, send '+' as %2B.";

    public Task BindModelAsync(ModelBindingContext bindingContext)
    {
        var valueResult = bindingContext.ValueProvider.GetValue(bindingContext.ModelName);
        if (valueResult == ValueProviderResult.None || string.IsNullOrWhiteSpace(valueResult.FirstValue))
        {
            return Task.CompletedTask;
        }

        bindingContext.ModelState.SetModelValue(bindingContext.ModelName, valueResult);
        var value = valueResult.FirstValue;

        if (!DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        {
            bindingContext.ModelState.TryAddModelError(bindingContext.ModelName, InvalidMessage);
        }
        else if (!HasOffset(value))
        {
            bindingContext.ModelState.TryAddModelError(bindingContext.ModelName, MissingOffsetMessage);
        }
        else
        {
            bindingContext.Result = ModelBindingResult.Success(time);
        }

        return Task.CompletedTask;
    }

    /// <summary>Whether the text states its offset (or "Z") rather than leaving it to the parser's local time zone.</summary>
    public static bool HasOffset(string value) =>
        DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dateTime)
        && dateTime.Kind != DateTimeKind.Unspecified;
}

/// <summary>
/// Uses <see cref="OffsetRequiredDateTimeOffsetBinder"/> for every <see cref="DateTimeOffset"/> outside request bodies.
/// </summary>
public sealed class OffsetRequiredDateTimeOffsetBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context) =>
        context.Metadata.UnderlyingOrModelType == typeof(DateTimeOffset)
        && context.BindingInfo.BindingSource != BindingSource.Body
            ? new OffsetRequiredDateTimeOffsetBinder()
            : null;
}
