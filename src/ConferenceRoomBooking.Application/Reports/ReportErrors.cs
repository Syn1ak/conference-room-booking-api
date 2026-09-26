using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// Expected failures when requesting a report.
/// </summary>
public static class ReportErrors
{
    public static readonly Error PeriodEndsBeforeStart = FieldError(
        "Report.PeriodEndsBeforeStart", nameof(ReportPeriod.To), "The period can't end before it starts.");

    public static readonly Error PeriodTooLong = FieldError(
        "Report.PeriodTooLong", nameof(ReportPeriod.To), $"A report covers at most {ReportPeriod.MaxDays} days.");

    private static Error FieldError(string code, string field, string message) =>
        Error.Validation(code, message, new Dictionary<string, string[]> { [field] = [message] });
}
