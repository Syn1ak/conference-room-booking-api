using ConferenceRoomBooking.Domain.Services;

namespace ConferenceRoomBooking.Api.Services;

/// <summary>
/// A service in the catalog, with the price in UAH that rooms charge unless they set their own.
/// </summary>
public sealed record ServiceResponse(Guid Id, string Name, decimal StandardPrice)
{
    public static ServiceResponse From(Service service) => new(service.Id, service.Name, service.StandardPrice);
}
