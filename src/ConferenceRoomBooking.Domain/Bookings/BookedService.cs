namespace ConferenceRoomBooking.Domain.Bookings;

/// <summary>
/// A service chosen for a booking, with its name and price saved as they were when the booking was made.
/// </summary>
public sealed record BookedService
{
    public BookedService(Guid serviceId, string name, decimal price)
    {
        ServiceId = serviceId;
        Name = name;
        Price = price;
    }

    public Guid ServiceId { get; }

    public string Name { get; }

    /// <summary>Price in UAH that the room charged for the service at booking time.</summary>
    public decimal Price { get; }
}
