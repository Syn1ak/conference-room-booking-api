using ConferenceRoomBooking.Application.Rooms;
using ConferenceRoomBooking.Domain.Rooms;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Rooms;

/// <summary>
/// <see cref="IRoomRepository"/> implemented with EF Core.
/// </summary>
public sealed class RoomRepository(ApplicationDbContext dbContext) : IRoomRepository
{
    public Task<Room?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        RoomsWithOfferings().SingleOrDefaultAsync(room => room.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken) =>
        await RoomsWithOfferings().OrderBy(room => room.Name).ToListAsync(cancellationToken);

    // The database collation ignores case, as the unique index on the name does.
    public Task<bool> NameExistsAsync(string name, Guid? exceptId, CancellationToken cancellationToken) =>
        dbContext.Rooms.AnyAsync(room => room.Name == name && room.Id != exceptId, cancellationToken);

    public Task<bool> HasBookingsAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Bookings.AnyAsync(booking => booking.RoomId == id, cancellationToken);

    public void Add(Room room) => dbContext.Rooms.Add(room);

    public void Remove(Room room) => dbContext.Rooms.Remove(room);

    // Offerings are owned and always loaded with the room, but the services they refer to are not.
    private IQueryable<Room> RoomsWithOfferings() =>
        dbContext.Rooms.Include(room => room.Offerings).ThenInclude(offering => offering.Service);
}
