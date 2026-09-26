using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Pricing;
using ConferenceRoomBooking.Domain.Rooms;

namespace ConferenceRoomBooking.Domain.Bookings;

/// <summary>
/// A client's reservation of a room for a time slot. The room's prices are saved when the booking is made,
/// so later changes to the room don't change what the client agreed to pay.
/// </summary>
public sealed class Booking
{
    private readonly List<BookedService> _bookedServices;

    private Booking(
        Guid id,
        Guid roomId,
        Guid clientId,
        BookingSlot slot,
        int attendeeCount,
        decimal roomHourlyPrice,
        List<BookedService> bookedServices,
        PriceBreakdown price)
    {
        Id = id;
        RoomId = roomId;
        ClientId = clientId;
        Slot = slot;
        AttendeeCount = attendeeCount;
        Status = BookingStatus.Confirmed;
        RoomHourlyPrice = roomHourlyPrice;
        _bookedServices = bookedServices;
        RentalPrice = price.RentalPrice;
        TotalPrice = price.TotalPrice;
    }

    /// <summary>Used by EF Core, which sets the properties from the database.</summary>
    private Booking()
    {
        Slot = null!;
        _bookedServices = [];
    }

    public Guid Id { get; }

    public Guid RoomId { get; }

    /// <summary>The id of the user who made the booking.</summary>
    public Guid ClientId { get; }

    public BookingSlot Slot { get; }

    public int AttendeeCount { get; }

    public BookingStatus Status { get; private set; }

    /// <summary>When the booking was cancelled, in UTC, or <see langword="null"/> while it's confirmed.</summary>
    public DateTimeOffset? CancelledAt { get; private set; }

    /// <summary>The room's base hourly price in UAH at booking time.</summary>
    public decimal RoomHourlyPrice { get; }

    public IReadOnlyCollection<BookedService> BookedServices => _bookedServices;

    /// <summary>The room rental in UAH at booking time, after time-of-day discounts and surcharges.</summary>
    public decimal RentalPrice { get; }

    /// <summary>What the client pays in UAH: the room rental plus the chosen services.</summary>
    public decimal TotalPrice { get; }

    /// <summary>
    /// Books <paramref name="room"/> for a client, with services chosen from those the room offers, and prices it
    /// with time bands applied in <paramref name="venueTimeZone"/>.
    /// Doesn't check for overlapping bookings; that needs the room's other bookings and is done by the caller.
    /// </summary>
    public static Result<Booking> Create(
        Room room,
        Guid clientId,
        BookingSlot slot,
        int attendeeCount,
        IReadOnlyCollection<Guid> serviceIds,
        TimeZoneInfo venueTimeZone)
    {
        if (attendeeCount < 1)
        {
            return BookingErrors.NoAttendees;
        }

        if (attendeeCount > room.Capacity)
        {
            return BookingErrors.ExceedsCapacity(room.Capacity);
        }

        if (serviceIds.Distinct().Count() != serviceIds.Count)
        {
            return BookingErrors.ServiceChosenTwice;
        }

        var bookedServices = new List<BookedService>(serviceIds.Count);
        foreach (var serviceId in serviceIds)
        {
            var offering = room.Offerings.FirstOrDefault(offering => offering.ServiceId == serviceId);
            if (offering is null)
            {
                return BookingErrors.ServiceNotOffered(serviceId);
            }

            bookedServices.Add(new BookedService(offering.ServiceId, offering.Service.Name, offering.Price));
        }

        var price = PriceCalculator.Calculate(slot, room.HourlyPrice, bookedServices, venueTimeZone);

        return new Booking(
            Guid.CreateVersion7(), room.Id, clientId, slot, attendeeCount, room.HourlyPrice, bookedServices, price);
    }

    /// <summary>
    /// Cancels a confirmed booking that hasn't started yet, freeing its time slot.
    /// </summary>
    public Result Cancel(DateTimeOffset now)
    {
        if (Status == BookingStatus.Cancelled)
        {
            return BookingErrors.AlreadyCancelled;
        }

        if (now >= Slot.Start)
        {
            return BookingErrors.AlreadyStarted;
        }

        Status = BookingStatus.Cancelled;
        CancelledAt = now.ToUniversalTime();
        return Result.Success;
    }
}
