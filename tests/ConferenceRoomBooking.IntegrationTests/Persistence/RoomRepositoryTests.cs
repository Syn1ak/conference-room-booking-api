using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Rooms;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class RoomRepositoryTests(DatabaseFixture database)
{
    [Fact]
    public async Task GetByIdAsync_LoadsOfferingsWithTheirServices()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(projector, 650m);
        await TestData.SaveAsync(database, projector, room);

        await using var dbContext = database.CreateDbContext();
        var loaded = await new RoomRepository(dbContext).GetByIdAsync(room.Id, default);

        var offering = Assert.Single(loaded!.Offerings);
        Assert.Equal((projector.Name, 650m), (offering.Service.Name, offering.Price));
    }

    [Fact]
    public async Task GetByIdAsync_ForUnknownRoom_ReturnsNull()
    {
        await using var dbContext = database.CreateDbContext();

        Assert.Null(await new RoomRepository(dbContext).GetByIdAsync(Guid.NewGuid(), default));
    }

    [Fact]
    public async Task ListAsync_ReturnsRoomsOrderedByName_WithOfferingsAndTheirServices()
    {
        var suffix = Guid.NewGuid().ToString("N");
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var zulu = Room.Create($"Zulu {suffix}", 50, 2000m).Value;
        var alpha = Room.Create($"Alpha {suffix}", 50, 2000m).Value;
        alpha.OfferService(projector);
        await TestData.SaveAsync(database, projector, zulu, alpha);

        await using var dbContext = database.CreateDbContext();
        var rooms = await new RoomRepository(dbContext).ListAsync(default);

        var ids = rooms.Select(r => r.Id).ToList();
        Assert.True(ids.IndexOf(alpha.Id) < ids.IndexOf(zulu.Id));
        var listed = rooms.Single(r => r.Id == alpha.Id);
        Assert.Equal(projector.Name, Assert.Single(listed.Offerings).Service.Name);
    }

    [Fact]
    public async Task NameExistsAsync_IgnoresCase_AndSkipsTheExcludedRoom()
    {
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        await TestData.SaveAsync(database, room);

        await using var dbContext = database.CreateDbContext();
        var repository = new RoomRepository(dbContext);

        Assert.True(await repository.NameExistsAsync(room.Name.ToLowerInvariant(), null, default));
        Assert.False(await repository.NameExistsAsync(room.Name, room.Id, default));
        Assert.False(await repository.NameExistsAsync(TestData.UniqueName("Room"), null, default));
    }

    [Fact]
    public async Task HasBookingsAsync_CountsCancelledBookings()
    {
        var bookedRoom = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        var freeRoom = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        await using (var dbContext = database.CreateDbContext())
        {
            var clientId = await TestData.CreateClientAsync(dbContext);
            var booking = Booking.Create(bookedRoom, clientId, TestData.Slot(10, 12), 10, [], TestData.Kyiv).Value;
            booking.Cancel(TestData.Now);
            dbContext.AddRange(bookedRoom, freeRoom, booking);
            await dbContext.SaveChangesAsync();
        }

        await using var verifyContext = database.CreateDbContext();
        var repository = new RoomRepository(verifyContext);

        Assert.True(await repository.HasBookingsAsync(bookedRoom.Id, default));
        Assert.False(await repository.HasBookingsAsync(freeRoom.Id, default));
    }

    [Fact]
    public async Task Remove_DeletesTheRoom()
    {
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        await TestData.SaveAsync(database, room);

        await using (var dbContext = database.CreateDbContext())
        {
            var repository = new RoomRepository(dbContext);
            repository.Remove((await repository.GetByIdAsync(room.Id, default))!);
            Assert.True((await new UnitOfWork(dbContext).SaveChangesAsync(default)).IsSuccess);
        }

        await using var verifyContext = database.CreateDbContext();
        Assert.Null(await new RoomRepository(verifyContext).GetByIdAsync(room.Id, default));
    }
}
