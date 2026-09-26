namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// Rates in reports: fractions from 0 to 1.
/// </summary>
internal static class Rates
{
    public const int DecimalPlaces = 4;

    /// <summary><paramref name="part"/> of <paramref name="whole"/>, or 0 when there is no whole to take a part of.</summary>
    public static decimal Fraction(decimal part, decimal whole) =>
        whole == 0 ? 0 : Math.Round(part / whole, DecimalPlaces, MidpointRounding.AwayFromZero);
}
