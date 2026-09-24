using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Infrastructure.Authentication;
using ConferenceRoomBooking.Infrastructure.Identity;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ConferenceRoomBooking.Infrastructure;

/// <summary>
/// Registers the Infrastructure layer's services in the dependency injection container.
/// </summary>
public static class DependencyInjection
{
    private const string ConnectionStringName = "DefaultConnection";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddPersistence(configuration);
        services.AddIdentityServices(configuration);
        services.AddAccessTokens(configuration);

        return services;
    }

    private static void AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName)
            ?? throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is not configured. " +
                "Set it in user-secrets locally or in the App Service settings in Azure.");

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
    }

    private static void AddIdentityServices(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<AdminAccountOptions>()
            .Bind(configuration.GetSection(AdminAccountOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddScoped<IdentitySeeder>();

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;

                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;

                // Lock the account for a while after repeated failed logins to slow down password guessing.
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
    }

    private static void AddAccessTokens(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<IAccessTokenGenerator, JwtAccessTokenGenerator>();
    }
}
