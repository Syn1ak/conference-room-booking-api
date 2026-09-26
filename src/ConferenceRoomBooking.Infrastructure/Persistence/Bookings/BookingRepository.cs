using ConferenceRoomBooking.Application.Bookings;
using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Domain.Bookings;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Bookings;

/// <summary>
/// <see cref="IBookingRepository"/> implemented with EF Core.
/// </summary>
public sealed class BookingRepository(ApplicationDbContext dbContext) : IBookingRepository
{
    public Task<Booking?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Bookings.SingleOrDefaultAsync(booking => booking.Id == id, cancellationToken);

    public Task<Page<Booking>> ListForClientAsync(
        Guid clientId, int pageNumber, int pageSize, CancellationToken cancellationToken) =>
        ToPageAsync(
            dbContext.Bookings.Where(booking => booking.ClientId == clientId), pageNumber, pageSize, cancellationToken);

    public Task<Page<Booking>> ListAsync(int pageNumber, int pageSize, CancellationToken cancellationToken) =>
        ToPageAsync(dbContext.Bookings, pageNumber, pageSize, cancellationToken);

    public Task<bool> HasOverlapAsync(Guid roomId, BookingSlot slot, CancellationToken cancellationToken) =>
        dbContext.Bookings
            .Where(booking => booking.RoomId == roomId)
            .ConfirmedOverlapping(slot)
            .AnyAsync(cancellationToken);

    public void Add(Booking booking) => dbContext.Bookings.Add(booking);

    private static async Task<Page<Booking>> ToPageAsync(
        IQueryable<Booking> bookings, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var totalCount = await bookings.CountAsync(cancellationToken);

        // The id breaks ties between bookings that start at the same time, so pages don't overlap or skip any.
        var items = await bookings
            .OrderByDescending(booking => booking.Slot.Start)
            .ThenByDescending(booking => booking.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new Page<Booking>(items, pageNumber, pageSize, totalCount);
    }
}
