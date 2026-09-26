namespace ConferenceRoomBooking.Application.Common;

/// <summary>
/// One page of a longer list, with how many items the whole list has.
/// </summary>
/// <param name="Items">The items on this page.</param>
/// <param name="Number">The page number, starting at 1.</param>
/// <param name="Size">The most items a page holds.</param>
/// <param name="TotalCount">How many items all pages hold together.</param>
public sealed record Page<T>(IReadOnlyList<T> Items, int Number, int Size, int TotalCount);
