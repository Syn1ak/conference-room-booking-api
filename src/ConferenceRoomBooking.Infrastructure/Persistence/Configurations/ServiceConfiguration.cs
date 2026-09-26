using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Configurations;

internal sealed class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public const string NameIndex = "IX_Services_Name";

    public void Configure(EntityTypeBuilder<Service> builder)
    {
        builder.ToTable("Services");

        builder.HasKey(service => service.Id);
        builder.Property(service => service.Id).ValueGeneratedNever();

        builder.Property(service => service.Name).HasMaxLength(Service.NameMaxLength);
        builder.HasIndex(service => service.Name).IsUnique().HasDatabaseName(NameIndex);

        builder.Property(service => service.StandardPrice).HasPrecision(18, Prices.DecimalPlaces);

        builder.HasData(InitialCatalog.Services.Select(service => new
        {
            service.Id,
            service.Name,
            service.StandardPrice,
        }));
    }
}
