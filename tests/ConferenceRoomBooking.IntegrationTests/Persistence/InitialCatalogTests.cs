using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class InitialCatalogTests(DatabaseFixture database)
{
    [Fact]
    public async Task MigratedDatabase_HasTheInitialServices()
    {
        var seedIds = InitialCatalog.Services.Select(service => service.Id).ToList();

        await using var dbContext = database.CreateDbContext();
        var services = await dbContext.Services.Where(service => seedIds.Contains(service.Id)).ToListAsync();

        Assert.Equal(
            [("Projector", 500m), ("Sound", 700m), ("Wi-Fi", 300m)],
            services.OrderBy(service => service.Name).Select(service => (service.Name, service.StandardPrice)));
    }

    [Fact]
    public async Task MigratedDatabase_HasTheInitialRooms_EachOfferingEveryServiceAtItsStandardPrice()
    {
        var seedIds = InitialCatalog.Rooms.Select(room => room.Id).ToList();

        await using var dbContext = database.CreateDbContext();
        var rooms = await dbContext.Rooms
            .Include(room => room.Offerings).ThenInclude(offering => offering.Service)
            .Where(room => seedIds.Contains(room.Id))
            .ToListAsync();

        Assert.Equal(
            [("Room A", 50, 2000m), ("Room B", 100, 3500m), ("Room C", 30, 1500m)],
            rooms.OrderBy(room => room.Name).Select(room => (room.Name, room.Capacity, room.HourlyPrice)));
        Assert.All(rooms, room => Assert.Equal(
            [("Projector", 500m), ("Sound", 700m), ("Wi-Fi", 300m)],
            room.Offerings.OrderBy(offering => offering.Service.Name).Select(offering => (offering.Service.Name, offering.Price))));
    }
}
