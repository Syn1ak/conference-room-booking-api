using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class UnitOfWorkTests(DatabaseFixture database)
{
    [Fact]
    public async Task SaveChangesAsync_WhenAnotherRequestTookTheRoomName_ReturnsNameTaken()
    {
        var name = TestData.UniqueName("Room");
        await using var first = database.CreateDbContext();
        await using var second = database.CreateDbContext();
        first.Rooms.Add(Room.Create(name, 50, 2000m).Value);
        second.Rooms.Add(Room.Create(name.ToUpperInvariant(), 30, 1500m).Value);

        var firstResult = await new UnitOfWork(first).SaveChangesAsync(default);
        var secondResult = await new UnitOfWork(second).SaveChangesAsync(default);

        Assert.True(firstResult.IsSuccess);
        Assert.Equal(RoomErrors.NameTaken, secondResult.Error);
    }

    [Fact]
    public async Task SaveChangesAsync_WhenAnotherRequestTookTheServiceName_ReturnsNameTaken()
    {
        var name = TestData.UniqueName("Sound");
        await using var first = database.CreateDbContext();
        await using var second = database.CreateDbContext();
        first.Services.Add(Service.Create(name, 700m).Value);
        second.Services.Add(Service.Create(name, 800m).Value);

        await new UnitOfWork(first).SaveChangesAsync(default);
        var secondResult = await new UnitOfWork(second).SaveChangesAsync(default);

        Assert.Equal(ServiceErrors.NameTaken, secondResult.Error);
    }

    [Fact]
    public async Task SaveChangesAsync_OnOtherDatabaseErrors_Throws()
    {
        var service = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(service);
        await TestData.SaveAsync(database, service, room);

        await using var dbContext = database.CreateDbContext();
        dbContext.Services.Remove(await dbContext.Services.SingleAsync(s => s.Id == service.Id));

        var exception = await Assert.ThrowsAsync<DbUpdateException>(
            () => new UnitOfWork(dbContext).SaveChangesAsync(default));
        Assert.Equal(TestData.ForeignKeyViolation, TestData.SqlErrorNumber(exception));
    }
}
