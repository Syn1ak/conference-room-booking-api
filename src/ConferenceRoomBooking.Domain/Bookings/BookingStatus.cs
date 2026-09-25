namespace ConferenceRoomBooking.Domain.Bookings;

public enum BookingStatus
{
    /// <summary>The room is reserved for the client.</summary>
    Confirmed,

    /// <summary>The booking was cancelled before it started, and its time slot is free again.</summary>
    Cancelled,
}
