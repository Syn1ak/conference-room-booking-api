using ConferenceRoomBooking.Application.Services;
using ConferenceRoomBooking.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Services;

/// <summary>
/// <see cref="IServiceRepository"/> implemented with EF Core.
/// </summary>
public sealed class ServiceRepository(ApplicationDbContext dbContext) : IServiceRepository
{
    public Task<Service?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Services.SingleOrDefaultAsync(service => service.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Service>> GetByIdsAsync(
        IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken) =>
        await dbContext.Services.Where(service => ids.Contains(service.Id)).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Service>> ListAsync(CancellationToken cancellationToken) =>
        await dbContext.Services.OrderBy(service => service.Name).ToListAsync(cancellationToken);

    // The database collation ignores case, as the unique index on the name does.
    public Task<bool> NameExistsAsync(string name, Guid? exceptId, CancellationToken cancellationToken) =>
        dbContext.Services.AnyAsync(service => service.Name == name && service.Id != exceptId, cancellationToken);

    public async Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken) =>
        await dbContext.Rooms.AnyAsync(
            room => room.Offerings.Any(offering => offering.ServiceId == id), cancellationToken)
        || await dbContext.Bookings.AnyAsync(
            booking => booking.BookedServices.Any(service => service.ServiceId == id), cancellationToken);

    public void Add(Service service) => dbContext.Services.Add(service);

    public void Remove(Service service) => dbContext.Services.Remove(service);
}
