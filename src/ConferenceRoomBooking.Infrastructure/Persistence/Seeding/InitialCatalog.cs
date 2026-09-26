namespace ConferenceRoomBooking.Infrastructure.Persistence.Seeding;

/// <summary>
/// The rooms and services the business starts with, seeded by a migration with fixed ids.
/// Once released, these values must not change: a changed seed would overwrite what admins edited through the API.
/// </summary>
public static class InitialCatalog
{
    public static readonly SeedService Projector = new(Guid.Parse("43ad914e-33df-4222-9ef7-609a1978be69"), "Projector", 500m);
    public static readonly SeedService WiFi = new(Guid.Parse("201ec157-075f-4f54-9303-ce07cbaf97cb"), "Wi-Fi", 300m);
    public static readonly SeedService Sound = new(Guid.Parse("f2b39118-e101-4525-bfad-0191703b893f"), "Sound", 700m);

    public static readonly SeedRoom RoomA = new(Guid.Parse("046b6271-5db7-4729-a09a-dc6d0ded15de"), "Room A", 50, 2000m);
    public static readonly SeedRoom RoomB = new(Guid.Parse("be95fc4b-2368-4d36-9852-bb15c0c0be77"), "Room B", 100, 3500m);
    public static readonly SeedRoom RoomC = new(Guid.Parse("819515e4-aae1-42d5-b99d-e52dae949c5b"), "Room C", 30, 1500m);

    public static readonly IReadOnlyList<SeedService> Services = [Projector, WiFi, Sound];

    public static readonly IReadOnlyList<SeedRoom> Rooms = [RoomA, RoomB, RoomC];

    /// <summary>Every seeded room offers every seeded service at its standard price.</summary>
    public static readonly IReadOnlyList<SeedOffering> Offerings =
    [
        .. from room in Rooms
           from service in Services
           select new SeedOffering(room.Id, service.Id, service.StandardPrice),
    ];

    public sealed record SeedService(Guid Id, string Name, decimal StandardPrice);

    public sealed record SeedRoom(Guid Id, string Name, int Capacity, decimal HourlyPrice);

    public sealed record SeedOffering(Guid RoomId, Guid ServiceId, decimal Price);
}
