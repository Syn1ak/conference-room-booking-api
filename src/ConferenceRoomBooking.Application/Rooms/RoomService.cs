using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Application.Services;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Application.Rooms;

/// <summary>
/// Use cases for conference rooms and the services they offer.
/// </summary>
public sealed class RoomService(IRoomRepository rooms, IServiceRepository services, IUnitOfWork unitOfWork)
{
    public Task<IReadOnlyList<Room>> ListAsync(CancellationToken cancellationToken) =>
        rooms.ListAsync(cancellationToken);

    public async Task<Result<Room>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        await rooms.GetByIdAsync(id, cancellationToken) is { } room ? room : RoomErrors.NotFound;

    /// <summary>
    /// Adds a room that offers the given catalog services.
    /// </summary>
    public async Task<Result<Room>> CreateAsync(RoomDetails details, CancellationToken cancellationToken)
    {
        var created = Room.Create(details.Name, details.Capacity, details.HourlyPrice);
        if (!created.IsSuccess)
        {
            return created.Error;
        }

        var room = created.Value;
        var offered = await ReplaceOfferingsAsync(room, details.Services, cancellationToken);
        if (!offered.IsSuccess)
        {
            return offered.Error;
        }

        if (await rooms.NameExistsAsync(room.Name, exceptId: null, cancellationToken))
        {
            return RoomErrors.NameTaken;
        }

        rooms.Add(room);
        return await SaveAsync(room, cancellationToken);
    }

    /// <summary>
    /// Replaces everything about a room with <paramref name="details"/>, including the services it offers.
    /// Existing bookings keep the prices they were made with.
    /// </summary>
    public async Task<Result<Room>> UpdateAsync(Guid id, RoomDetails details, CancellationToken cancellationToken)
    {
        if (await rooms.GetByIdAsync(id, cancellationToken) is not { } room)
        {
            return RoomErrors.NotFound;
        }

        var updated = room.Update(details.Name, details.Capacity, details.HourlyPrice);
        if (!updated.IsSuccess)
        {
            return updated.Error;
        }

        var offered = await ReplaceOfferingsAsync(room, details.Services, cancellationToken);
        if (!offered.IsSuccess)
        {
            return offered.Error;
        }

        if (await rooms.NameExistsAsync(room.Name, exceptId: room.Id, cancellationToken))
        {
            return RoomErrors.NameTaken;
        }

        return await SaveAsync(room, cancellationToken);
    }

    private async Task<Result> ReplaceOfferingsAsync(
        Room room, IReadOnlyList<OfferedService> offeredServices, CancellationToken cancellationToken)
    {
        var serviceIds = offeredServices.Select(offered => offered.ServiceId).Distinct().ToList();
        var catalogServices = (await services.GetByIdsAsync(serviceIds, cancellationToken))
            .ToDictionary(service => service.Id);

        var offerings = new List<(Service Service, decimal? Price)>(offeredServices.Count);
        foreach (var offered in offeredServices)
        {
            if (!catalogServices.TryGetValue(offered.ServiceId, out var service))
            {
                return RoomErrors.ServiceNotInCatalog(offered.ServiceId);
            }

            offerings.Add((service, offered.Price));
        }

        return room.ReplaceOfferings(offerings);
    }

    private async Task<Result<Room>> SaveAsync(Room room, CancellationToken cancellationToken)
    {
        var saved = await unitOfWork.SaveChangesAsync(cancellationToken);
        return saved.IsSuccess ? room : saved.Error;
    }
}
