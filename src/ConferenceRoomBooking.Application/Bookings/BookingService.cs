using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Application.Rooms;
using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Pricing;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Application.Bookings;

/// <summary>
/// Use cases for bookings: booking a room, reading bookings, and cancelling them. Clients only ever see their own bookings;
/// admins see all of them.
/// </summary>
public sealed class BookingService(
    IBookingRepository bookings,
    IRoomRepository rooms,
    IRoomBookingLock roomBookingLock,
    IUnitOfWork unitOfWork,
    ICurrentUser currentUser,
    VenueTimeZone venueTimeZone,
    TimeProvider timeProvider)
{
    /// <summary>
    /// Books a room for the current user and prices the booking. Fails with a conflict if a confirmed booking of the
    /// room overlaps the time; the room's lock makes that check safe against concurrent requests.
    /// </summary>
    public Task<Result<BookingConfirmation>> CreateAsync(NewBooking request, CancellationToken cancellationToken) =>
        roomBookingLock.RunExclusiveAsync<BookingConfirmation>(
            request.RoomId,
            async token =>
            {
                if (await rooms.GetByIdAsync(request.RoomId, token) is not { } room)
                {
                    return RoomErrors.NotFound;
                }

                var slot = BookingSlot.Create(
                    request.Start, request.End, timeProvider.GetUtcNow(), venueTimeZone.TimeZone);
                if (!slot.IsSuccess)
                {
                    return slot.Error;
                }

                var created = Booking.Create(
                    room, currentUser.Id, slot.Value, request.AttendeeCount, request.ServiceIds, venueTimeZone.TimeZone);
                if (!created.IsSuccess)
                {
                    return created.Error;
                }

                if (await bookings.HasOverlapAsync(room.Id, slot.Value, token))
                {
                    return BookingErrors.SlotTaken;
                }

                var booking = created.Value;
                bookings.Add(booking);
                var saved = await unitOfWork.SaveChangesAsync(token);
                if (!saved.IsSuccess)
                {
                    return saved.Error;
                }

                return new BookingConfirmation(booking, CalculatePrice(booking));
            },
            cancellationToken);

    /// <summary>
    /// Returns a booking the current user may see. Another client's booking is reported as not found, so its
    /// existence isn't revealed.
    /// </summary>
    public async Task<Result<Booking>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        await bookings.GetByIdAsync(id, cancellationToken) is { } booking && CanSee(booking)
            ? booking
            : BookingErrors.NotFound;

    /// <summary>
    /// A page of the bookings the current user may see: a client's own, or all of them for an admin.
    /// </summary>
    public Task<Page<Booking>> ListAsync(int pageNumber, int pageSize, CancellationToken cancellationToken) =>
        IsAdmin
            ? bookings.ListAsync(pageNumber, pageSize, cancellationToken)
            : bookings.ListForClientAsync(currentUser.Id, pageNumber, pageSize, cancellationToken);

    /// <summary>
    /// Cancels one of the current client's bookings that hasn't started yet, which frees its time slot.
    /// Another client's booking is reported as not found.
    /// </summary>
    public async Task<Result<Booking>> CancelAsync(Guid id, CancellationToken cancellationToken)
    {
        if (await bookings.GetByIdAsync(id, cancellationToken) is not { } booking || booking.ClientId != currentUser.Id)
        {
            return BookingErrors.NotFound;
        }

        var cancelled = booking.Cancel(timeProvider.GetUtcNow());
        if (!cancelled.IsSuccess)
        {
            return cancelled.Error;
        }

        var saved = await unitOfWork.SaveChangesAsync(cancellationToken);
        return saved.IsSuccess ? booking : saved.Error;
    }

    private bool IsAdmin => currentUser.Roles.Contains(Roles.Admin);

    private bool CanSee(Booking booking) => IsAdmin || booking.ClientId == currentUser.Id;

    // The same calculation Booking.Create made, from the prices the booking saved.
    private PriceBreakdown CalculatePrice(Booking booking) =>
        PriceCalculator.Calculate(booking.Slot, booking.RoomHourlyPrice, booking.BookedServices, venueTimeZone.TimeZone);
}
