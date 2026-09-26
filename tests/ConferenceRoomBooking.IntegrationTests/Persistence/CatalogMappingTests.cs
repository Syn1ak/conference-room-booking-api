using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class CatalogMappingTests(DatabaseFixture database)
{
    [Fact]
    public async Task Service_IsReadBackAsSaved()
    {
        var service = Service.Create(TestData.UniqueName("Projector"), 500.55m).Value;
        await SaveAsync(service);

        await using var dbContext = database.CreateDbContext();
        var loaded = await dbContext.Services.SingleAsync(s => s.Id == service.Id);

        Assert.Equal((service.Name, 500.55m), (loaded.Name, loaded.StandardPrice));
    }

    [Fact]
    public async Task Room_IsReadBackWithOfferingsAndTheirServices()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var wiFi = Service.Create(TestData.UniqueName("Wi-Fi"), 300m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 1999.99m).Value;
        room.OfferService(projector, 650m);
        room.OfferService(wiFi);
        await SaveAsync(projector, wiFi, room);

        await using var dbContext = database.CreateDbContext();
        var loaded = await dbContext.Rooms
            .Include(r => r.Offerings).ThenInclude(offering => offering.Service)
            .SingleAsync(r => r.Id == room.Id);

        Assert.Equal((room.Name, 50, 1999.99m), (loaded.Name, loaded.Capacity, loaded.HourlyPrice));
        Assert.Equal(
            [(projector.Id, projector.Name, 650m), (wiFi.Id, wiFi.Name, 300m)],
            loaded.Offerings
                .OrderByDescending(offering => offering.Price)
                .Select(offering => (offering.ServiceId, offering.Service.Name, offering.Price)));
    }

    [Fact]
    public async Task Room_KeepsOfferingChangesAndRemovals()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var wiFi = Service.Create(TestData.UniqueName("Wi-Fi"), 300m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(projector);
        room.OfferService(wiFi);
        await SaveAsync(projector, wiFi, room);

        await using (var dbContext = database.CreateDbContext())
        {
            var tracked = await dbContext.Rooms.SingleAsync(r => r.Id == room.Id);
            tracked.ChangeServicePrice(projector.Id, 550m);
            tracked.StopOfferingService(wiFi.Id);
            await dbContext.SaveChangesAsync();
        }

        await using var verifyContext = database.CreateDbContext();
        var loaded = await verifyContext.Rooms.SingleAsync(r => r.Id == room.Id);
        var offering = Assert.Single(loaded.Offerings);
        Assert.Equal((projector.Id, 550m), (offering.ServiceId, offering.Price));
    }

    [Fact]
    public async Task RoomName_MustBeUnique_IgnoringCase()
    {
        var name = TestData.UniqueName("Room");
        await SaveAsync(Room.Create(name, 50, 2000m).Value);

        var exception = await Assert.ThrowsAsync<DbUpdateException>(
            () => SaveAsync(Room.Create(name.ToUpperInvariant(), 30, 1500m).Value));

        Assert.Equal(TestData.UniqueIndexViolation, TestData.SqlErrorNumber(exception));
    }

    [Fact]
    public async Task ServiceName_MustBeUnique_IgnoringCase()
    {
        var name = TestData.UniqueName("Sound");
        await SaveAsync(Service.Create(name, 700m).Value);

        var exception = await Assert.ThrowsAsync<DbUpdateException>(
            () => SaveAsync(Service.Create(name.ToLowerInvariant(), 800m).Value));

        Assert.Equal(TestData.UniqueIndexViolation, TestData.SqlErrorNumber(exception));
    }

    [Fact]
    public async Task DeletingServiceOfferedByRoom_Fails()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(projector);
        await SaveAsync(projector, room);

        await using var dbContext = database.CreateDbContext();
        dbContext.Services.Remove(await dbContext.Services.SingleAsync(s => s.Id == projector.Id));
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => dbContext.SaveChangesAsync());

        Assert.Equal(TestData.ForeignKeyViolation, TestData.SqlErrorNumber(exception));
    }

    [Fact]
    public async Task DeletingRoom_DeletesItsOfferings()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(projector);
        await SaveAsync(projector, room);

        await using (var dbContext = database.CreateDbContext())
        {
            dbContext.Rooms.Remove(await dbContext.Rooms.SingleAsync(r => r.Id == room.Id));
            await dbContext.SaveChangesAsync();
        }

        await using var verifyContext = database.CreateDbContext();
        var offeringCount = await verifyContext.Database
            .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM RoomServices WHERE RoomId = {room.Id}")
            .SingleAsync();
        Assert.Equal(0, offeringCount);
        Assert.True(await verifyContext.Services.AnyAsync(s => s.Id == projector.Id));
    }

    private async Task SaveAsync(params object[] entities)
    {
        await using var dbContext = database.CreateDbContext();
        dbContext.AddRange(entities);
        await dbContext.SaveChangesAsync();
    }
}
