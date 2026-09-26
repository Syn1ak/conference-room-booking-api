using ConferenceRoomBooking.Domain.Common;

namespace ConferenceRoomBooking.Domain.Bookings;

/// <summary>
/// Expected failures when booking a room.
/// </summary>
public static class BookingErrors
{
    public static readonly Error EndNotAfterStart = Error.Validation(
        "Booking.EndNotAfterStart",
        "A booking must end after it starts.");

    public static readonly Error OutsideOpeningHours = Error.Validation(
        "Booking.OutsideOpeningHours",
        $"A booking must start and end on the same day, between {BookingSlot.OpeningTime:HH:mm} and {BookingSlot.ClosingTime:HH:mm} venue time.");

    public static readonly Error NotOnTimeGrid = Error.Validation(
        "Booking.NotOnTimeGrid",
        $"A booking must start and end on a {BookingSlot.TimeStep.TotalMinutes:0}-minute step, for example 10:00, 10:15 or 10:30.");

    public static readonly Error TooShort = Error.Validation(
        "Booking.TooShort",
        $"A booking must last at least {BookingSlot.MinimumDuration.TotalMinutes:0} minutes.");

    public static readonly Error StartsInPast = Error.Validation(
        "Booking.StartsInPast",
        "A booking must start in the future.");

    public static readonly Error TooFarAhead = Error.Validation(
        "Booking.TooFarAhead",
        $"A booking can start at most {BookingSlot.MaximumYearsAhead} year ahead.");

    public static readonly Error NoAttendees = FieldError(
        "Booking.NoAttendees", nameof(Booking.AttendeeCount), "A booking needs at least 1 attendee.");

    public static Error ExceedsCapacity(int capacity) => FieldError(
        "Booking.ExceedsCapacity", nameof(Booking.AttendeeCount), $"The room holds at most {capacity} people.");

    public static readonly Error ServiceChosenTwice = FieldError(
        "Booking.ServiceChosenTwice", "ServiceIds", "Each service can be chosen only once.");

    public static Error ServiceNotOffered(Guid serviceId) => FieldError(
        "Booking.ServiceNotOffered", "ServiceIds", $"The room doesn't offer the service {serviceId}.");

    public static readonly Error NotFound = Error.NotFound(
        "Booking.NotFound",
        "The booking doesn't exist.");

    public static readonly Error SlotTaken = Error.Conflict(
        "Booking.SlotTaken",
        "The room is already booked for some or all of this time.");

    // Cancelling is refused because of the booking's current state, not because the request is malformed.
    public static readonly Error AlreadyCancelled = Error.Conflict(
        "Booking.AlreadyCancelled",
        "The booking is already cancelled.");

    public static readonly Error AlreadyStarted = Error.Conflict(
        "Booking.AlreadyStarted",
        "A booking can't be cancelled once it has started.");

    private static Error FieldError(string code, string field, string message) =>
        Error.Validation(code, message, new Dictionary<string, string[]> { [field] = [message] });
}
