using ConferenceRoomBooking.Application.Reports;

namespace ConferenceRoomBooking.Api.Reports;

/// <summary>
/// How much of the rooms' opening hours (06:00–23:00, 17 hours a day) confirmed bookings fill in the period, and how
/// full the rooms are when booked.
/// </summary>
/// <param name="Period">The days the report covers.</param>
/// <param name="Overall">All rooms together.</param>
/// <param name="Rooms">Every room, ordered by name, including rooms without bookings.</param>
public sealed record OccupancyReportResponse(
    ReportPeriodResponse Period, OccupancyFiguresResponse Overall, IReadOnlyList<RoomOccupancyResponse> Rooms)
{
    public static OccupancyReportResponse From(OccupancyReport report) => new(
        ReportPeriodResponse.Of(report.Period),
        OccupancyFiguresResponse.From(report.Overall),
        [
            .. report.Rooms.Select(room => new RoomOccupancyResponse(
                room.RoomId, room.RoomName, room.Capacity, OccupancyFiguresResponse.From(room.Occupancy))),
        ]);
}

/// <summary>
/// How much of the open hours confirmed bookings fill, and how full the rooms are when booked. Rates are fractions
/// from 0 to 1.
/// </summary>
/// <param name="BookingCount">How many confirmed bookings there are.</param>
/// <param name="BookedHours">The hours the confirmed bookings last.</param>
/// <param name="OpenHours">The hours the rooms could have been booked for: 17 per room per day.</param>
/// <param name="OccupancyRate">Booked hours as a fraction of open hours.</param>
/// <param name="AverageAttendees">The average attendee count of the confirmed bookings.</param>
/// <param name="FillRate">
/// Attendees as a fraction of the room's current capacity, averaged over the confirmed bookings.
/// </param>
/// <param name="Cancellations">The bookings that were cancelled.</param>
public sealed record OccupancyFiguresResponse(
    int BookingCount,
    decimal BookedHours,
    decimal OpenHours,
    decimal OccupancyRate,
    decimal AverageAttendees,
    decimal FillRate,
    CancellationFiguresResponse Cancellations)
{
    public static OccupancyFiguresResponse From(OccupancyFigures figures) => new(
        figures.BookingCount,
        figures.BookedHours,
        figures.OpenHours,
        figures.OccupancyRate,
        figures.AverageAttendees,
        figures.FillRate,
        CancellationFiguresResponse.From(figures.Cancellations));
}

/// <summary>
/// One room's occupancy in the period.
/// </summary>
/// <param name="RoomId">The room's id.</param>
/// <param name="RoomName">The room's current name.</param>
/// <param name="Capacity">The room's current capacity, which the fill rate is measured against.</param>
/// <param name="Occupancy">The room's figures.</param>
public sealed record RoomOccupancyResponse(
    Guid RoomId, string RoomName, int Capacity, OccupancyFiguresResponse Occupancy);
