using ConferenceRoomBooking.Domain.Bookings;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Configurations;

internal sealed class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    private const int StatusMaxLength = 20;

    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("Bookings");

        builder.HasKey(booking => booking.Id);
        builder.Property(booking => booking.Id).ValueGeneratedNever();

        // A room or a client can't be deleted while bookings refer to them.
        builder.Property(booking => booking.RoomId);
        builder.HasOne<Room>().WithMany().HasForeignKey(booking => booking.RoomId).OnDelete(DeleteBehavior.Restrict);
        builder.Property(booking => booking.ClientId);
        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(booking => booking.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.ComplexProperty(booking => booking.Slot, slot =>
        {
            slot.Property(s => s.Start).HasColumnName("Start");
            slot.Property(s => s.End).HasColumnName("End");
        });

        builder.Property(booking => booking.AttendeeCount);
        builder.Property(booking => booking.Status).HasConversion<string>().HasMaxLength(StatusMaxLength);
        builder.Property(booking => booking.CancelledAt);

        builder.Property(booking => booking.RoomHourlyPrice).HasPrecision(18, Prices.DecimalPlaces);
        builder.Property(booking => booking.RentalPrice).HasPrecision(18, Prices.DecimalPlaces);
        builder.Property(booking => booking.TotalPrice).HasPrecision(18, Prices.DecimalPlaces);

        builder.OwnsMany(booking => booking.BookedServices, service =>
        {
            service.ToTable("BookingServices");
            service.WithOwner().HasForeignKey("BookingId");
            service.HasKey("BookingId", nameof(BookedService.ServiceId));

            service.Property(s => s.ServiceId);
            service.Property(s => s.Name).HasMaxLength(Service.NameMaxLength);
            service.Property(s => s.Price).HasPrecision(18, Prices.DecimalPlaces);

            // A catalog service can't be deleted while a booking includes it.
            service.HasOne<Service>().WithMany().HasForeignKey(s => s.ServiceId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Navigation(booking => booking.BookedServices).HasField("_bookedServices");

        // Overlap checks and availability search look up a room's bookings by time, through an index on
        // (RoomId, Start) including End and Status. EF Core can't index a complex property's columns, so the index
        // is created in the AddBookings migration instead of here.
    }
}
