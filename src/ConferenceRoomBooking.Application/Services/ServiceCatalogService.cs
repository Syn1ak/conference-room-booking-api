using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Application.Services;

/// <summary>
/// Use cases for the catalog of services that rooms can offer: listing, adding, changing, and deleting them.
/// </summary>
public sealed class ServiceCatalogService(IServiceRepository services, IUnitOfWork unitOfWork)
{
    public Task<IReadOnlyList<Service>> ListAsync(CancellationToken cancellationToken) =>
        services.ListAsync(cancellationToken);

    public async Task<Result<Service>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        await services.GetByIdAsync(id, cancellationToken) is { } service ? service : ServiceErrors.NotFound;

    public async Task<Result<Service>> CreateAsync(string name, decimal standardPrice, CancellationToken cancellationToken)
    {
        var created = Service.Create(name, standardPrice);
        if (!created.IsSuccess)
        {
            return created.Error;
        }

        var service = created.Value;
        if (await services.NameExistsAsync(service.Name, exceptId: null, cancellationToken))
        {
            return ServiceErrors.NameTaken;
        }

        services.Add(service);
        return await SaveAsync(service, cancellationToken);
    }

    public async Task<Result<Service>> UpdateAsync(
        Guid id, string name, decimal standardPrice, CancellationToken cancellationToken)
    {
        if (await services.GetByIdAsync(id, cancellationToken) is not { } service)
        {
            return ServiceErrors.NotFound;
        }

        var updated = service.Update(name, standardPrice);
        if (!updated.IsSuccess)
        {
            return updated.Error;
        }

        if (await services.NameExistsAsync(service.Name, exceptId: service.Id, cancellationToken))
        {
            return ServiceErrors.NameTaken;
        }

        return await SaveAsync(service, cancellationToken);
    }

    /// <summary>
    /// Deletes a service that no room offers and no booking includes.
    /// </summary>
    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await services.GetByIdAsync(id, cancellationToken) is not { } service)
        {
            return ServiceErrors.NotFound;
        }

        if (await services.IsInUseAsync(id, cancellationToken))
        {
            return ServiceErrors.InUse;
        }

        services.Remove(service);
        return await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<Result<Service>> SaveAsync(Service service, CancellationToken cancellationToken)
    {
        var saved = await unitOfWork.SaveChangesAsync(cancellationToken);
        return saved.IsSuccess ? service : saved.Error;
    }
}
