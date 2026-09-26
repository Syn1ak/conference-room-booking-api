using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Bookings;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class RoomBookingLockTests(DatabaseFixture database) : IAsyncLifetime
{
    private const int ParallelRequests = 10;

    /// <summary>
    /// A pause between the overlap check and the insert. Without it, the requests rarely check at the same moment,
    /// and SQL Server's row locks alone often make the later ones wait, so the test would pass even without the room lock.
    /// </summary>
    private static readonly TimeSpan PauseBeforeSaving = TimeSpan.FromMilliseconds(100);

    private readonly Room _room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
    private readonly Room _otherRoom = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
    private Guid _clientId;

    public async Task InitializeAsync()
    {
        await using var dbContext = database.CreateDbContext();
        _clientId = await TestData.CreateClientAsync(dbContext);
        dbContext.AddRange(_room, _otherRoom);
        await dbContext.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task ParallelRequestsForTheSameSlot_BookItExactlyOnce()
    {
        var slot = TestData.Slot(10, 12);

        var results = await Task.WhenAll(
            Enumerable.Range(0, ParallelRequests).Select(_ => Task.Run(() => TryBookAsync(_room, slot))));

        Assert.Single(results, result => result.IsSuccess);
        Assert.All(results.Where(result => !result.IsSuccess), result => Assert.Equal(BookingErrors.SlotTaken, result.Error));
        Assert.Equal(1, await CountBookingsAsync(_room.Id));
    }

    [Fact]
    public async Task ParallelRequestsForDifferentRooms_AllSucceed()
    {
        var slot = TestData.Slot(10, 12);

        var results = await Task.WhenAll(
            Task.Run(() => TryBookAsync(_room, slot)),
            Task.Run(() => TryBookAsync(_otherRoom, slot)));

        Assert.All(results, result => Assert.True(result.IsSuccess));
    }

    [Fact]
    public async Task ActionReturningFailure_SavesNothing()
    {
        await using var dbContext = database.CreateDbContext();
        var bookings = new BookingRepository(dbContext);

        var result = await new SqlServerRoomBookingLock(dbContext).RunExclusiveAsync<Guid>(
            _room.Id,
            async token =>
            {
                bookings.Add(Booking.Create(_room, _clientId, TestData.Slot(10, 12), 10, [], TestData.Kyiv).Value);
                await new UnitOfWork(dbContext).SaveChangesAsync(token);
                return BookingErrors.SlotTaken;
            },
            default);

        Assert.Equal(BookingErrors.SlotTaken, result.Error);
        Assert.Equal(0, await CountBookingsAsync(_room.Id));
    }

    [Fact]
    public async Task Lock_IsHeldDuringTheAction_AndReleasedAfterIt()
    {
        bool? freeDuringAction = null;

        await using (var dbContext = database.CreateDbContext())
        {
            await new SqlServerRoomBookingLock(dbContext).RunExclusiveAsync<bool>(
                _room.Id,
                async _ =>
                {
                    freeDuringAction = await IsLockFreeAsync(_room.Id);
                    return true;
                },
                default);
        }

        Assert.False(freeDuringAction);
        Assert.True(await IsLockFreeAsync(_room.Id));
    }

    /// <summary>What a booking use case does: check for an overlap and save the booking, both under the room's lock.</summary>
    private async Task<Result<Guid>> TryBookAsync(Room room, BookingSlot slot)
    {
        await using var dbContext = database.CreateDbContext();
        var bookings = new BookingRepository(dbContext);
        var unitOfWork = new UnitOfWork(dbContext);

        return await new SqlServerRoomBookingLock(dbContext).RunExclusiveAsync<Guid>(
            room.Id,
            async token =>
            {
                if (await bookings.HasOverlapAsync(room.Id, slot, token))
                {
                    return BookingErrors.SlotTaken;
                }

                await Task.Delay(PauseBeforeSaving, token);

                var booking = Booking.Create(room, _clientId, slot, 10, [], TestData.Kyiv).Value;
                bookings.Add(booking);
                var saved = await unitOfWork.SaveChangesAsync(token);
                return saved.IsSuccess ? booking.Id : saved.Error;
            },
            default);
    }

    /// <summary>Asks SQL Server, from a connection of its own, whether the room's lock could be taken right now.</summary>
    private async Task<bool> IsLockFreeAsync(Guid roomId)
    {
        await using var dbContext = database.CreateDbContext();
        var result = await dbContext.Database
            .SqlQuery<int>($"SELECT APPLOCK_TEST('public', {$"room-bookings:{roomId}"}, 'Exclusive', 'Session') AS Value")
            .ToListAsync();
        return result.Single() == 1;
    }

    private async Task<int> CountBookingsAsync(Guid roomId)
    {
        await using var dbContext = database.CreateDbContext();
        return await dbContext.Bookings.CountAsync(booking => booking.RoomId == roomId);
    }
}
