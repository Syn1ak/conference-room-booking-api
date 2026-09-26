using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Application.Reports;

/// <summary>
/// How much of the rooms' opening hours confirmed bookings fill in a period, and how full the rooms are when booked.
/// </summary>
/// <param name="Overall">All rooms together.</param>
/// <param name="Rooms">Every room, ordered by name, including rooms without bookings.</param>
public sealed record OccupancyReport(ReportPeriod Period, OccupancyFigures Overall, IReadOnlyList<RoomOccupancy> Rooms)
{
    /// <summary>A room can be booked from opening to closing time every day.</summary>
    public static readonly decimal OpenHoursPerDay =
        (decimal)(BookingSlot.ClosingTime - BookingSlot.OpeningTime).Ticks / TimeSpan.TicksPerHour;

    /// <summary>
    /// Builds the report from the <paramref name="bookings"/> that start within <paramref name="period"/> and all
    /// <paramref name="rooms"/>, ordered by name. Fill rates use each room's current capacity.
    /// </summary>
    public static OccupancyReport Build(
        ReportPeriod period, IReadOnlyList<ReportBooking> bookings, IReadOnlyList<Room> rooms)
    {
        var capacities = rooms.ToDictionary(room => room.Id, room => room.Capacity);
        var bookingsByRoom = bookings.ToLookup(booking => booking.RoomId);

        return new OccupancyReport(
            period,
            OccupancyFigures.Of(bookings, capacities, OpenHoursPerDay * period.DayCount * rooms.Count),
            [
                .. rooms.Select(room => new RoomOccupancy(
                    room.Id,
                    room.Name,
                    room.Capacity,
                    OccupancyFigures.Of([.. bookingsByRoom[room.Id]], capacities, OpenHoursPerDay * period.DayCount))),
            ]);
    }
}

/// <summary>
/// How much of the open hours confirmed bookings fill, and how full the rooms are when booked.
/// </summary>
/// <param name="BookingCount">How many confirmed bookings there are.</param>
/// <param name="BookedHours">The hours the confirmed bookings last.</param>
/// <param name="OpenHours">The hours the rooms could have been booked for.</param>
/// <param name="OccupancyRate">Booked hours as a fraction of open hours.</param>
/// <param name="AverageAttendees">The average attendee count of the confirmed bookings, rounded to 2 decimal places.</param>
/// <param name="FillRate">Attendees as a fraction of the room's capacity, averaged over the confirmed bookings.</param>
/// <param name="Cancellations">The bookings that were cancelled.</param>
public sealed record OccupancyFigures(
    int BookingCount,
    decimal BookedHours,
    decimal OpenHours,
    decimal OccupancyRate,
    decimal AverageAttendees,
    decimal FillRate,
    CancellationFigures Cancellations)
{
    /// <summary>
    /// The figures for confirmed and cancelled <paramref name="bookings"/>, with each room's capacity looked up in
    /// <paramref name="capacities"/> by room id.
    /// </summary>
    public static OccupancyFigures Of(
        IReadOnlyCollection<ReportBooking> bookings, IReadOnlyDictionary<Guid, int> capacities, decimal openHours)
    {
        var confirmed = bookings.Where(booking => booking.Status == BookingStatus.Confirmed).ToList();
        var bookedHours = confirmed.Sum(booking => booking.Hours);
        var attendees = confirmed.Sum(booking => booking.AttendeeCount);
        var fillRates = confirmed.Sum(booking => (decimal)booking.AttendeeCount / capacities[booking.RoomId]);

        return new OccupancyFigures(
            confirmed.Count,
            bookedHours,
            openHours,
            Rates.Fraction(bookedHours, openHours),
            confirmed.Count == 0 ? 0 : Math.Round((decimal)attendees / confirmed.Count, 2, MidpointRounding.AwayFromZero),
            Rates.Fraction(fillRates, confirmed.Count),
            CancellationFigures.Of(bookings));
    }
}

/// <summary>
/// One room's occupancy, with its current capacity.
/// </summary>
public sealed record RoomOccupancy(Guid RoomId, string RoomName, int Capacity, OccupancyFigures Occupancy);
