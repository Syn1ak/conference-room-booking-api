using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;

namespace ConferenceRoomBooking.UnitTests.Infrastructure.Persistence;

/// <summary>
/// The seed is inserted by a migration without going through the Domain factories, so these tests check that it
/// would pass them.
/// </summary>
public sealed class InitialCatalogTests
{
    [Fact]
    public void Services_PassDomainRules()
    {
        Assert.All(InitialCatalog.Services, seed =>
            Assert.True(Service.Create(seed.Name, seed.StandardPrice).IsSuccess, seed.Name));
    }

    [Fact]
    public void RoomsWithTheirOfferings_PassDomainRules()
    {
        foreach (var seed in InitialCatalog.Rooms)
        {
            var room = Room.Create(seed.Name, seed.Capacity, seed.HourlyPrice);
            Assert.True(room.IsSuccess, seed.Name);

            foreach (var offering in InitialCatalog.Offerings.Where(offering => offering.RoomId == seed.Id))
            {
                var service = InitialCatalog.Services.Single(service => service.Id == offering.ServiceId);
                var result = room.Value.OfferService(Service.Create(service.Name, service.StandardPrice).Value, offering.Price);
                Assert.True(result.IsSuccess, $"{seed.Name}: {service.Name}");
            }
        }
    }

    [Fact]
    public void IdsAndNames_AreUnique()
    {
        Assert.Distinct(InitialCatalog.Services.Select(service => service.Id));
        Assert.Distinct(InitialCatalog.Services.Select(service => service.Name.ToUpperInvariant()));
        Assert.Distinct(InitialCatalog.Rooms.Select(room => room.Id));
        Assert.Distinct(InitialCatalog.Rooms.Select(room => room.Name.ToUpperInvariant()));
    }
}
