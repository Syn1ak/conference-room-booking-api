using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Rooms;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class RoomAvailabilityTests(DatabaseFixture database) : IAsyncLifetime
{
    private Guid _clientId;

    public async Task InitializeAsync()
    {
        await using var dbContext = database.CreateDbContext();
        _clientId = await TestData.CreateClientAsync(dbContext);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task FindAvailableAsync_ReturnsOnlyRoomsBigEnough()
    {
        var small = await SaveRoomAsync(30);
        var exact = await SaveRoomAsync(50);
        var large = await SaveRoomAsync(100);

        var available = await FindAvailableIdsAsync(TestData.Slot(10, 12), 50);

        Assert.DoesNotContain(small.Id, available);
        Assert.Contains(exact.Id, available);
        Assert.Contains(large.Id, available);
    }

    [Fact]
    public async Task FindAvailableAsync_LeavesOutRoomsWithOverlappingConfirmedBooking()
    {
        var booked = await SaveRoomAsync(50);
        await SaveBookingAsync(booked, TestData.Slot(11, 13), cancelled: false);

        var available = await FindAvailableIdsAsync(TestData.Slot(10, 12), 10);

        Assert.DoesNotContain(booked.Id, available);
    }

    [Fact]
    public async Task FindAvailableAsync_IncludesRoomsWithOnlyCancelledOrBackToBackBookings()
    {
        var cancelled = await SaveRoomAsync(50);
        await SaveBookingAsync(cancelled, TestData.Slot(10, 12), cancelled: true);
        var backToBack = await SaveRoomAsync(50);
        await SaveBookingAsync(backToBack, TestData.Slot(12, 14), cancelled: false);

        var available = await FindAvailableIdsAsync(TestData.Slot(10, 12), 10);

        Assert.Contains(cancelled.Id, available);
        Assert.Contains(backToBack.Id, available);
    }

    [Fact]
    public async Task FindAvailableAsync_LoadsOfferingsWithTheirServices()
    {
        var projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
        var room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        room.OfferService(projector);
        await TestData.SaveAsync(database, projector, room);

        await using var dbContext = database.CreateDbContext();
        var rooms = await new RoomRepository(dbContext).FindAvailableAsync(TestData.Slot(10, 12), 10, default);

        Assert.Equal(projector.Name, Assert.Single(rooms.Single(r => r.Id == room.Id).Offerings).Service.Name);
    }

    private async Task<Room> SaveRoomAsync(int capacity)
    {
        var room = Room.Create(TestData.UniqueName("Room"), capacity, 2000m).Value;
        await TestData.SaveAsync(database, room);
        return room;
    }

    private async Task SaveBookingAsync(Room room, BookingSlot slot, bool cancelled)
    {
        var booking = Booking.Create(room, _clientId, slot, 10, [], TestData.Kyiv).Value;
        if (cancelled)
        {
            booking.Cancel(TestData.Now);
        }

        await TestData.SaveAsync(database, booking);
    }

    private async Task<List<Guid>> FindAvailableIdsAsync(BookingSlot slot, int capacity)
    {
        await using var dbContext = database.CreateDbContext();
        var rooms = await new RoomRepository(dbContext).FindAvailableAsync(slot, capacity, default);
        return rooms.Select(room => room.Id).ToList();
    }
}
