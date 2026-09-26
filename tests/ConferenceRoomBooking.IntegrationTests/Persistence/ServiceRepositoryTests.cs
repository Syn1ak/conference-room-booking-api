using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Services;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class ServiceRepositoryTests(DatabaseFixture database)
{
    [Fact]
    public async Task GetByIdAsync_ReturnsTheService_OrNullWhenUnknown()
    {
        var service = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        await TestData.SaveAsync(database, service);

        await using var dbContext = database.CreateDbContext();
        var repository = new ServiceRepository(dbContext);

        Assert.Equal(service.Name, (await repository.GetByIdAsync(service.Id, default))?.Name);
        Assert.Null(await repository.GetByIdAsync(Guid.NewGuid(), default));
    }

    [Fact]
    public async Task GetByIdsAsync_ReturnsOnlyServicesThatExist()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var wiFi = Service.Create(TestData.UniqueName("Wi-Fi"), 300m).Value;
        await TestData.SaveAsync(database, projector, wiFi);

        await using var dbContext = database.CreateDbContext();
        var services = await new ServiceRepository(dbContext).GetByIdsAsync([projector.Id, Guid.NewGuid()], default);

        Assert.Equal([projector.Id], services.Select(service => service.Id));
    }

    [Fact]
    public async Task ListAsync_ReturnsServicesOrderedByName()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var zulu = Service.Create($"Zulu {suffix}", 1m).Value;
        var alpha = Service.Create($"Alpha {suffix}", 1m).Value;
        await TestData.SaveAsync(database, zulu, alpha);

        await using var dbContext = database.CreateDbContext();
        var services = await new ServiceRepository(dbContext).ListAsync(default);

        var names = services.Select(service => service.Name).ToList();
        Assert.True(names.IndexOf(alpha.Name) < names.IndexOf(zulu.Name));
    }

    [Fact]
    public async Task NameExistsAsync_IgnoresCase_AndSkipsTheExcludedService()
    {
        var service = Service.Create(TestData.UniqueName("Sound"), 700m).Value;
        await TestData.SaveAsync(database, service);

        await using var dbContext = database.CreateDbContext();
        var repository = new ServiceRepository(dbContext);

        Assert.True(await repository.NameExistsAsync(service.Name.ToUpperInvariant(), null, default));
        Assert.False(await repository.NameExistsAsync(service.Name, service.Id, default));
        Assert.False(await repository.NameExistsAsync(TestData.UniqueName("Sound"), null, default));
    }

    [Fact]
    public async Task IsInUseAsync_ForUnusedService_IsFalse()
    {
        var service = Service.Create(TestData.UniqueName("Water"), 0m).Value;
        await TestData.SaveAsync(database, service);

        await using var dbContext = database.CreateDbContext();

        Assert.False(await new ServiceRepository(dbContext).IsInUseAsync(service.Id, default));
    }

    [Fact]
    public async Task IsInUseAsync_ForServiceOfferedByRoom_IsTrue()
    {
        var service = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(service);
        await TestData.SaveAsync(database, service, room);

        await using var dbContext = database.CreateDbContext();

        Assert.True(await new ServiceRepository(dbContext).IsInUseAsync(service.Id, default));
    }

    [Fact]
    public async Task IsInUseAsync_ForServiceOnlyInBooking_IsTrue()
    {
        var service = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(service);
        await using (var dbContext = database.CreateDbContext())
        {
            var clientId = await TestData.CreateClientAsync(dbContext);
            dbContext.AddRange(service, room);
            dbContext.Add(Booking.Create(room, clientId, TestData.Slot(10, 12), 10, [service.Id], TestData.Kyiv).Value);
            await dbContext.SaveChangesAsync();

            room.StopOfferingService(service.Id);
            await dbContext.SaveChangesAsync();
        }

        await using var verifyContext = database.CreateDbContext();

        Assert.True(await new ServiceRepository(verifyContext).IsInUseAsync(service.Id, default));
    }

    [Fact]
    public async Task AddAndRemove_AreSavedByTheUnitOfWork()
    {
        var service = Service.Create(TestData.UniqueName("Sound"), 700m).Value;

        await using (var dbContext = database.CreateDbContext())
        {
            new ServiceRepository(dbContext).Add(service);
            Assert.True((await new UnitOfWork(dbContext).SaveChangesAsync(default)).IsSuccess);
        }

        await using (var dbContext = database.CreateDbContext())
        {
            var repository = new ServiceRepository(dbContext);
            repository.Remove((await repository.GetByIdAsync(service.Id, default))!);
            Assert.True((await new UnitOfWork(dbContext).SaveChangesAsync(default)).IsSuccess);
        }

        await using var verifyContext = database.CreateDbContext();
        Assert.Null(await new ServiceRepository(verifyContext).GetByIdAsync(service.Id, default));
    }
}
