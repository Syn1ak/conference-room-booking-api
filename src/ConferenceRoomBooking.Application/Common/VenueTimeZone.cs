namespace ConferenceRoomBooking.Application.Common;

/// <summary>
/// The time zone the venue's wall-clock rules are evaluated in: opening hours, the time grid, and pricing bands.
/// </summary>
public sealed class VenueTimeZone(TimeZoneInfo timeZone)
{
    public TimeZoneInfo TimeZone { get; } = timeZone;
}
