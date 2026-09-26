namespace ConferenceRoomBooking.Api.Common;

/// <summary>
/// Upper bounds for request values that the business rules leave open.
/// </summary>
public static class RequestLimits
{
    /// <summary>
    /// The highest price in UAH a request may set. It keeps every booking total, even a full day with the peak
    /// surcharge, far below what the database's money columns can hold.
    /// </summary>
    public const double MaxPrice = 1_000_000;
}
