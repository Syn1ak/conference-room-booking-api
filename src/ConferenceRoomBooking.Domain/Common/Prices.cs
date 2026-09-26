namespace ConferenceRoomBooking.Domain.Common;

/// <summary>
/// Rules shared by every price in UAH, which is charged and stored in whole kopiykas.
/// </summary>
public static class Prices
{
    /// <summary>How many decimal places a price can have: a kopiyka is one hundredth of a hryvnia.</summary>
    public const int DecimalPlaces = 2;

    /// <summary>
    /// Whether <paramref name="price"/> is a whole number of kopiykas, so it can be stored without rounding.
    /// Trailing zeros don't count: 500.500 is 500.50.
    /// </summary>
    public static bool IsInWholeKopiykas(decimal price) => decimal.Round(price, DecimalPlaces) == price;
}
