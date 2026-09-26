using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Bookings;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class BookingRepositoryTests(DatabaseFixture database) : IAsyncLifetime
{
    private readonly Service _projector = Service.Create(TestData.UniqueName("Projector"), 500m).Value;
    private readonly Room _room = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
    private Guid _clientId;

    public async Task InitializeAsync()
    {
        _room.OfferService(_projector);

        await using var dbContext = database.CreateDbContext();
        _clientId = await TestData.CreateClientAsync(dbContext);
        dbContext.AddRange(_projector, _room);
        await dbContext.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetByIdAsync_ReturnsTheBookingWithItsServices_OrNullWhenUnknown()
    {
        var booking = await SaveBookingAsync(_room, _clientId, TestData.Slot(10, 12), [_projector.Id]);

        await using var dbContext = database.CreateDbContext();
        var repository = new BookingRepository(dbContext);
        var loaded = await repository.GetByIdAsync(booking.Id, default);

        Assert.Equal(_projector.Name, Assert.Single(loaded!.BookedServices).Name);
        Assert.Null(await repository.GetByIdAsync(Guid.NewGuid(), default));
    }

    [Fact]
    public async Task ListForClientAsync_ReturnsOnlyThatClientsBookings_LatestStartFirst()
    {
        Guid otherClientId;
        await using (var dbContext = database.CreateDbContext())
        {
            otherClientId = await TestData.CreateClientAsync(dbContext);
        }

        var afternoon = await SaveBookingAsync(_room, _clientId, TestData.Slot(15, 16), []);
        var morning = await SaveBookingAsync(_room, _clientId, TestData.Slot(8, 9), []);
        await SaveBookingAsync(_room, otherClientId, TestData.Slot(10, 11), []);

        await using var verifyContext = database.CreateDbContext();
        var bookings = await new BookingRepository(verifyContext).ListForClientAsync(_clientId, 1, 10, default);

        Assert.Equal([afternoon.Id, morning.Id], bookings.Items.Select(booking => booking.Id));
        Assert.Equal(2, bookings.TotalCount);
    }

    [Fact]
    public async Task ListForClientAsync_ReturnsTheRequestedPage()
    {
        var bookings = new List<Booking>();
        foreach (var startHour in new[] { 8, 10, 12, 14, 16 })
        {
            bookings.Add(await SaveBookingAsync(_room, _clientId, TestData.Slot(startHour, startHour + 1), []));
        }

        await using var verifyContext = database.CreateDbContext();
        var page = await new BookingRepository(verifyContext).ListForClientAsync(_clientId, 2, 2, default);

        Assert.Equal([bookings[2].Id, bookings[1].Id], page.Items.Select(booking => booking.Id));
        Assert.Equal((2, 2, 5), (page.Number, page.Size, page.TotalCount));
    }

    [Fact]
    public async Task ListAsync_ReturnsBookingsOfAllClients()
    {
        Guid otherClientId;
        await using (var dbContext = database.CreateDbContext())
        {
            otherClientId = await TestData.CreateClientAsync(dbContext);
        }

        var first = await SaveBookingAsync(_room, _clientId, TestData.Slot(8, 9), []);
        var second = await SaveBookingAsync(_room, otherClientId, TestData.Slot(10, 11), []);

        await using var verifyContext = database.CreateDbContext();
        var repository = new BookingRepository(verifyContext);
        var firstPage = await repository.ListAsync(1, 100, default);
        var ids = new List<Guid>();
        for (var pageNumber = 1; ids.Count < firstPage.TotalCount; pageNumber++)
        {
            ids.AddRange((await repository.ListAsync(pageNumber, 100, default)).Items.Select(booking => booking.Id));
        }

        Assert.Contains(first.Id, ids);
        Assert.Contains(second.Id, ids);
    }

    [Theory]
    [InlineData(11, 13, true)] // partly overlapping
    [InlineData(9, 11, true)] // partly overlapping from before
    [InlineData(9, 13, true)] // containing
    [InlineData(10, 12, true)] // identical
    [InlineData(12, 14, false)] // back to back after
    [InlineData(8, 10, false)] // back to back before
    [InlineData(14, 16, false)] // separate
    public async Task HasOverlapAsync_ComparedWithTenToTwelve(int startHour, int endHour, bool expected)
    {
        await SaveBookingAsync(_room, _clientId, TestData.Slot(10, 12), []);

        await using var dbContext = database.CreateDbContext();
        var hasOverlap = await new BookingRepository(dbContext)
            .HasOverlapAsync(_room.Id, TestData.Slot(startHour, endHour), default);

        Assert.Equal(expected, hasOverlap);
    }

    [Fact]
    public async Task HasOverlapAsync_IgnoresCancelledBookings()
    {
        var booking = Booking.Create(_room, _clientId, TestData.Slot(10, 12), 10, [], TestData.Kyiv).Value;
        booking.Cancel(TestData.Now);
        await TestData.SaveAsync(database, booking);

        await using var dbContext = database.CreateDbContext();

        Assert.False(await new BookingRepository(dbContext).HasOverlapAsync(_room.Id, TestData.Slot(10, 12), default));
    }

    [Fact]
    public async Task HasOverlapAsync_IgnoresOtherRooms()
    {
        var otherRoom = Room.Create(TestData.UniqueName("Room"), 50, 2000m).Value;
        await TestData.SaveAsync(database, otherRoom);
        await SaveBookingAsync(otherRoom, _clientId, TestData.Slot(10, 12), []);

        await using var dbContext = database.CreateDbContext();

        Assert.False(await new BookingRepository(dbContext).HasOverlapAsync(_room.Id, TestData.Slot(10, 12), default));
    }

    [Fact]
    public async Task Add_IsSavedByTheUnitOfWork()
    {
        var booking = Booking.Create(_room, _clientId, TestData.Slot(10, 12), 10, [], TestData.Kyiv).Value;

        await using (var dbContext = database.CreateDbContext())
        {
            new BookingRepository(dbContext).Add(booking);
            Assert.True((await new UnitOfWork(dbContext).SaveChangesAsync(default)).IsSuccess);
        }

        await using var verifyContext = database.CreateDbContext();
        Assert.NotNull(await new BookingRepository(verifyContext).GetByIdAsync(booking.Id, default));
    }

    private async Task<Booking> SaveBookingAsync(
        Room room, Guid clientId, BookingSlot slot, IReadOnlyCollection<Guid> serviceIds)
    {
        var booking = Booking.Create(room, clientId, slot, 10, serviceIds, TestData.Kyiv).Value;
        await TestData.SaveAsync(database, booking);
        return booking;
    }
}
