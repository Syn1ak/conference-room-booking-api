using ConferenceRoomBooking.Application.Common;

namespace ConferenceRoomBooking.Api.Common;

/// <summary>
/// One page of a longer list.
/// </summary>
/// <param name="Items">The items on this page.</param>
/// <param name="Page">The page number, starting at 1.</param>
/// <param name="PageSize">The most items a page holds.</param>
/// <param name="TotalCount">How many items all pages hold together.</param>
public sealed record PageResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public static PageResponse<T> From<TSource>(Page<TSource> page, Func<TSource, T> map) =>
        new([.. page.Items.Select(map)], page.Number, page.Size, page.TotalCount);
}

/// <summary>
/// Limits for the page parameters of paged endpoints.
/// </summary>
public static class Paging
{
    public const int DefaultPageSize = 20;

    public const int MaxPageSize = 100;

    /// <summary>The highest page number, so that the number of items to skip still fits in an <see cref="int"/>.</summary>
    public const int MaxPage = int.MaxValue / MaxPageSize;
}
