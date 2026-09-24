using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.Infrastructure.Identity;

public static class IdentitySeedingExtensions
{
    /// <summary>
    /// Creates the roles and the first Admin account if they're missing. Runs on every startup.
    /// </summary>
    public static async Task SeedIdentityDataAsync(this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var seeder = scope.ServiceProvider.GetRequiredService<IdentitySeeder>();

        await seeder.SeedAsync();
    }
}
