using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Configurations;

internal sealed class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public const string NameIndex = "IX_Rooms_Name";

    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("Rooms");

        builder.HasKey(room => room.Id);
        builder.Property(room => room.Id).ValueGeneratedNever();

        builder.Property(room => room.Name).HasMaxLength(Room.NameMaxLength);
        builder.HasIndex(room => room.Name).IsUnique().HasDatabaseName(NameIndex);

        builder.Property(room => room.HourlyPrice).HasPrecision(18, Prices.DecimalPlaces);

        // Offerings exist only as part of their room, so they're owned: loaded with it and deleted with it.
        builder.OwnsMany(room => room.Offerings, offering =>
        {
            offering.ToTable("RoomServices");
            offering.WithOwner().HasForeignKey("RoomId");
            offering.HasKey("RoomId", nameof(ServiceOffering.ServiceId));

            offering.Property(o => o.Price).HasPrecision(18, Prices.DecimalPlaces);

            // A catalog service can't be deleted while a room offers it.
            offering.HasOne(o => o.Service)
                .WithMany()
                .HasForeignKey(o => o.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            offering.HasData(InitialCatalog.Offerings.Select(seed => new
            {
                seed.RoomId,
                seed.ServiceId,
                seed.Price,
            }));
        });
        builder.Navigation(room => room.Offerings).HasField("_offerings");

        builder.HasData(InitialCatalog.Rooms.Select(room => new
        {
            room.Id,
            room.Name,
            room.Capacity,
            room.HourlyPrice,
        }));
    }
}
