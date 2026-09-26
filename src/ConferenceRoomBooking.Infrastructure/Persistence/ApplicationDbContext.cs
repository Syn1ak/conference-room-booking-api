using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence;

/// <summary>
/// The application's database context: the catalog of rooms and services, and the ASP.NET Core Identity tables
/// for users and roles.
/// </summary>
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Service> Services => Set<Service>();

    public DbSet<Room> Rooms => Set<Room>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
