using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class BookingMappingTests(DatabaseFixture database) : IAsyncLifetime
{
    private readonly Service _projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
    private readonly Room _room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
    private Guid _clientId;

    public async Task InitializeAsync()
    {
        _room.OfferService(_projector, 650m);

        await using var dbContext = database.CreateDbContext();
        _clientId = await TestData.CreateClientAsync(dbContext);
        dbContext.AddRange(_projector, _room);
        await dbContext.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Booking_IsReadBackAsSaved()
    {
        var booking = await SaveBookingAsync([_projector.Id]);

        await using var dbContext = database.CreateDbContext();
        var loaded = await dbContext.Bookings.SingleAsync(b => b.Id == booking.Id);

        Assert.Equal(
            (_room.Id, _clientId, 40, BookingStatus.Confirmed, (DateTimeOffset?)null),
            (loaded.RoomId, loaded.ClientId, loaded.AttendeeCount, loaded.Status, loaded.CancelledAt));
        Assert.Equal(booking.Slot, loaded.Slot);
        Assert.Equal(TimeSpan.Zero, loaded.Slot.Start.Offset);
        Assert.Equal((2000m, 8600m, 9250m), (loaded.RoomHourlyPrice, loaded.RentalPrice, loaded.TotalPrice));
        Assert.Equal(
            [(_projector.Id, _projector.Name, 650m)],
            loaded.BookedServices.Select(service => (service.ServiceId, service.Name, service.Price)));
    }

    [Fact]
    public async Task Cancellation_IsSaved()
    {
        var booking = await SaveBookingAsync([]);
        var cancelledAt = TestData.Now.AddHours(1);

        await using (var dbContext = database.CreateDbContext())
        {
            var tracked = await dbContext.Bookings.SingleAsync(b => b.Id == booking.Id);
            tracked.Cancel(cancelledAt);
            await dbContext.SaveChangesAsync();
        }

        await using var verifyContext = database.CreateDbContext();
        var loaded = await verifyContext.Bookings.SingleAsync(b => b.Id == booking.Id);
        Assert.Equal((BookingStatus.Cancelled, cancelledAt), (loaded.Status, loaded.CancelledAt));
    }

    [Fact]
    public async Task Status_IsStoredAsText()
    {
        var booking = await SaveBookingAsync([]);

        await using var dbContext = database.CreateDbContext();
        var status = await dbContext.Database
            .SqlQuery<string>($"SELECT Status AS Value FROM Bookings WHERE Id = {booking.Id}")
            .SingleAsync();

        Assert.Equal("Confirmed", status);
    }

    [Fact]
    public async Task Bookings_HaveIndexOnRoomAndStart_IncludingEndAndStatus()
    {
        await using var dbContext = database.CreateDbContext();
        var columns = await dbContext.Database.SqlQuery<string>($"""
            SELECT CONCAT(c.name, CASE WHEN ic.is_included_column = 1 THEN ' (included)' ELSE '' END) AS Value
            FROM sys.indexes i
            JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE i.name = 'IX_Bookings_RoomId_Start' AND i.object_id = OBJECT_ID('Bookings')
            ORDER BY ic.is_included_column, ic.key_ordinal, c.name
            """).ToListAsync();

        Assert.Equal(["RoomId", "Start", "End (included)", "Status (included)"], columns);
    }

    [Fact]
    public async Task DeletingRoomWithBooking_Fails()
    {
        await SaveBookingAsync([]);

        await using var dbContext = database.CreateDbContext();
        dbContext.Rooms.Remove(await dbContext.Rooms.SingleAsync(r => r.Id == _room.Id));
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => dbContext.SaveChangesAsync());

        Assert.Equal(TestData.ForeignKeyViolation, TestData.SqlErrorNumber(exception));
    }

    [Fact]
    public async Task DeletingServiceInBooking_Fails_EvenWhenNoRoomOffersIt()
    {
        await SaveBookingAsync([_projector.Id]);
        await using (var dbContext = database.CreateDbContext())
        {
            var room = await dbContext.Rooms.SingleAsync(r => r.Id == _room.Id);
            room.StopOfferingService(_projector.Id);
            await dbContext.SaveChangesAsync();
        }

        await using var deleteContext = database.CreateDbContext();
        deleteContext.Services.Remove(await deleteContext.Services.SingleAsync(s => s.Id == _projector.Id));
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => deleteContext.SaveChangesAsync());

        Assert.Equal(TestData.ForeignKeyViolation, TestData.SqlErrorNumber(exception));
    }

    [Fact]
    public async Task BookingForUnknownClient_Fails()
    {
        var booking = Booking.Create(_room, Guid.NewGuid(), TestData.Slot(10, 14), 40, [], TestData.Kyiv).Value;

        await using var dbContext = database.CreateDbContext();
        dbContext.Bookings.Add(booking);
        var exception = await Assert.ThrowsAsync<DbUpdateException>(() => dbContext.SaveChangesAsync());

        Assert.Equal(TestData.ForeignKeyViolation, TestData.SqlErrorNumber(exception));
    }

    private async Task<Booking> SaveBookingAsync(IReadOnlyCollection<Guid> serviceIds)
    {
        var booking = Booking.Create(_room, _clientId, TestData.Slot(10, 14), 40, serviceIds, TestData.Kyiv).Value;

        await using var dbContext = database.CreateDbContext();
        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync();
        return booking;
    }
}
