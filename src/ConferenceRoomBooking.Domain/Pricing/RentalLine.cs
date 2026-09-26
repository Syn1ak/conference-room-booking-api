namespace ConferenceRoomBooking.Domain.Pricing;

/// <summary>
/// The part of a booking's room rental that falls into one time band.
/// </summary>
/// <param name="Start">Where the part starts, in the venue's offset.</param>
/// <param name="End">Where the part ends, in the venue's offset.</param>
/// <param name="Hours">The length of the part in hours, which can be fractional.</param>
/// <param name="Amount">Hours × hourly price × multiplier in UAH, rounded to kopiykas.</param>
public sealed record RentalLine(
    TimeBandKind Band,
    DateTimeOffset Start,
    DateTimeOffset End,
    decimal Hours,
    decimal Multiplier,
    decimal Amount);
