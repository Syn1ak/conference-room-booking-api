using System.ComponentModel.DataAnnotations;

namespace ConferenceRoomBooking.Api.Venue;

/// <summary>
/// Settings of the venue whose rooms are booked.
/// </summary>
public sealed class VenueOptions
{
    public const string SectionName = "Venue";

    /// <summary>IANA id of the venue's time zone, for example "Europe/Kyiv".</summary>
    [Required]
    public string TimeZone { get; init; } = string.Empty;
}
