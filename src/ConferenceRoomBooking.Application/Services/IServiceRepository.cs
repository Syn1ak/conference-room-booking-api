using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Application.Services;

/// <summary>
/// The catalog of services. Returned services are tracked, so changes to them are saved by <see cref="Common.IUnitOfWork"/>.
/// </summary>
public interface IServiceRepository
{
    Task<Service?> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>The services among <paramref name="ids"/> that exist. Unknown ids are left out.</summary>
    Task<IReadOnlyList<Service>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);

    /// <summary>All services, ordered by name.</summary>
    Task<IReadOnlyList<Service>> ListAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Whether a service other than <paramref name="exceptId"/> has this name. Names are compared ignoring case.
    /// </summary>
    Task<bool> NameExistsAsync(string name, Guid? exceptId, CancellationToken cancellationToken);

    /// <summary>Whether a room offers the service or a booking includes it, which means it can't be deleted.</summary>
    Task<bool> IsInUseAsync(Guid id, CancellationToken cancellationToken);

    void Add(Service service);

    void Remove(Service service);
}
