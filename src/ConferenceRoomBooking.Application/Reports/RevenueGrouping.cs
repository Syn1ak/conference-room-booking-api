namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// How the revenue report splits its period.
/// </summary>
public enum RevenueGrouping
{
    /// <summary>One entry per day.</summary>
    Day,

    /// <summary>One entry per calendar month, or the part of it the period covers.</summary>
    Month,
}
