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
}
