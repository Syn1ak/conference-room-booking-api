namespace ConferenceRoomBooking.Domain.Pricing;

/// <summary>
/// A span of venue local time with one rental rate: the room's hourly price times <see cref="Multiplier"/>.
/// The start is included and the end is excluded.
/// </summary>
public sealed record TimeBand(TimeBandKind Kind, TimeOnly Start, TimeOnly End, decimal Multiplier);
