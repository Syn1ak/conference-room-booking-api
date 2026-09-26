using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Reports;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

[Collection(nameof(DatabaseCollection))]
public sealed class ReportQueriesTests(DatabaseFixture database) : IAsyncLifetime
{
    private static readonly TimeSpan KyivSummer = TimeSpan.FromHours(3);

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
    public async Task ListBookingsAsync_ReturnsBookingsStartingOnThePeriodsDaysInVenueTime_InStartOrder()
    {
        await SaveBookingAsync(Slot(3, 22, 0, 23, 0));
        var lastOnTo = await SaveBookingAsync(Slot(5, 22, 30, 23, 0));
        var firstOnFrom = await SaveBookingAsync(Slot(4, 6, 0, 7, 0));
        await SaveBookingAsync(Slot(6, 6, 0, 6, 30));

        var bookings = await ListOwnBookingsAsync(September(4), September(5));

        Assert.Equal([firstOnFrom.Slot, lastOnTo.Slot], bookings.Select(booking => booking.Slot));
    }

    [Fact]
    public async Task ListBookingsAsync_ReturnsTheSavedDetails_IncludingCancelledBookings()
    {
        var confirmed = await SaveBookingAsync(Slot(7, 11, 0, 15, 0), attendeeCount: 12, [_projector.Id]);
        var cancelled = await SaveBookingAsync(Slot(7, 16, 0, 17, 0), cancel: true);

        var bookings = await ListOwnBookingsAsync(September(7), September(7));

        Assert.Equal(
            [
                new ReportBooking(
                    _room.Id, confirmed.Slot, BookingStatus.Confirmed, 12, 8600m, 9250m,
                    [new ReportBookedService(_projector.Id, 650m)]),
                new ReportBooking(_room.Id, cancelled.Slot, BookingStatus.Cancelled, 10, 2000m, 2000m, []),
            ],
            bookings,
            ReportBookingComparer.Instance);
    }

    private async Task<IReadOnlyList<ReportBooking>> ListOwnBookingsAsync(DateOnly from, DateOnly to)
    {
        await using var dbContext = database.CreateDbContext();
        var period = ReportPeriod.Create(from, to, TestData.Kyiv).Value;

        // The database is shared with other tests, which book rooms of their own.
        return [.. (await new ReportQueries(dbContext).ListBookingsAsync(period, default))
            .Where(booking => booking.RoomId == _room.Id)];
    }

    private async Task<Booking> SaveBookingAsync(
        BookingSlot slot, int attendeeCount = 10, IReadOnlyCollection<Guid>? serviceIds = null, bool cancel = false)
    {
        var booking = Booking.Create(_room, _clientId, slot, attendeeCount, serviceIds ?? [], TestData.Kyiv).Value;
        if (cancel)
        {
            booking.Cancel(TestData.Now);
        }

        await TestData.SaveAsync(database, booking);
        return booking;
    }

    /// <summary>A day in September 2026.</summary>
    private static DateOnly September(int day) => new(2026, 9, day);

    /// <summary>A slot on a day in September 2026, Kyiv time.</summary>
    private static BookingSlot Slot(int day, int startHour, int startMinute, int endHour, int endMinute) =>
        BookingSlot.Create(
            new DateTimeOffset(2026, 9, day, startHour, startMinute, 0, KyivSummer),
            new DateTimeOffset(2026, 9, day, endHour, endMinute, 0, KyivSummer),
            TestData.Now,
            TestData.Kyiv).Value;

    // Records compare their lists by reference, so the booked services are compared item by item here.
    private sealed class ReportBookingComparer : IEqualityComparer<ReportBooking>
    {
        public static readonly ReportBookingComparer Instance = new();

        private static readonly IReadOnlyList<ReportBookedService> NoServices = [];

        public bool Equals(ReportBooking? x, ReportBooking? y) =>
            x is not null && y is not null
            && x with { Services = NoServices } == y with { Services = NoServices }
            && x.Services.SequenceEqual(y.Services);

        public int GetHashCode(ReportBooking booking) => booking.RoomId.GetHashCode();
    }
}
