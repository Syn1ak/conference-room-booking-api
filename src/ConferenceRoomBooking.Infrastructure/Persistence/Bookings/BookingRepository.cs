using ConferenceRoomBooking.Application.Bookings;
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

    public async Task<IReadOnlyList<Booking>> ListForClientAsync(Guid clientId, CancellationToken cancellationToken) =>
        await dbContext.Bookings
            .Where(booking => booking.ClientId == clientId)
            .OrderBy(booking => booking.Slot.Start)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Booking>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.Bookings.OrderBy(booking => booking.Slot.Start).ToListAsync(cancellationToken);

    public Task<bool> HasOverlapAsync(Guid roomId, BookingSlot slot, CancellationToken cancellationToken) =>
        dbContext.Bookings
            .Where(booking => booking.RoomId == roomId)
            .ConfirmedOverlapping(slot)
            .AnyAsync(cancellationToken);

    public void Add(Booking booking) => dbContext.Bookings.Add(booking);
}
