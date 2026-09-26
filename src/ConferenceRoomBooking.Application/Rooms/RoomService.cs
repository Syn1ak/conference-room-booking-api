using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Application.Services;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;

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
        var offered = await OfferServicesAsync(room, details.Services, cancellationToken);
        if (!offered.IsSuccess)
        {
            return offered.Error;
        }

        if (await rooms.NameExistsAsync(room.Name, exceptId: null, cancellationToken))
        {
            return RoomErrors.NameTaken;
        }

        rooms.Add(room);
        var saved = await unitOfWork.SaveChangesAsync(cancellationToken);
        return saved.IsSuccess ? room : saved.Error;
    }

    private async Task<Result> OfferServicesAsync(
        Room room, IReadOnlyList<OfferedService> offeredServices, CancellationToken cancellationToken)
    {
        var serviceIds = offeredServices.Select(offered => offered.ServiceId).Distinct().ToList();
        var catalogServices = (await services.GetByIdsAsync(serviceIds, cancellationToken))
            .ToDictionary(service => service.Id);

        foreach (var offered in offeredServices)
        {
            if (!catalogServices.TryGetValue(offered.ServiceId, out var service))
            {
                return RoomErrors.ServiceNotInCatalog(offered.ServiceId);
            }

            var result = room.OfferService(service, offered.Price);
            if (!result.IsSuccess)
            {
                return result;
            }
        }

        return Result.Success;
    }
}
