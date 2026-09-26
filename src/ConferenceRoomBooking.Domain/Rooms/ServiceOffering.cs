using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Domain.Rooms;

/// <summary>
/// A catalog <see cref="Services.Service"/> that a room offers, at the price this room charges for it.
/// </summary>
public sealed class ServiceOffering
{
    internal ServiceOffering(Service service, decimal price)
    {
        ServiceId = service.Id;
        Service = service;
        Price = price;
    }

    /// <summary>Used by EF Core, which loads <see cref="Service"/> separately when it's included in a query.</summary>
    private ServiceOffering(Guid serviceId, decimal price)
    {
        ServiceId = serviceId;
        Service = null!;
        Price = price;
    }

    public Guid ServiceId { get; }

    public Service Service { get; }

    /// <summary>Price in UAH in this room. Starts as the service's standard price, but doesn't follow later changes to it.</summary>
    public decimal Price { get; private set; }

    internal void ChangePrice(decimal price) => Price = price;
}
