using System.ComponentModel.DataAnnotations;
using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Application.Bookings;
using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Application.Rooms;
using ConferenceRoomBooking.Application.Services;
using ConferenceRoomBooking.Infrastructure.Authentication;
using ConferenceRoomBooking.Infrastructure.Identity;
using ConferenceRoomBooking.Infrastructure.Persistence;
using ConferenceRoomBooking.Infrastructure.Persistence.Bookings;
using ConferenceRoomBooking.Infrastructure.Persistence.Reports;
using ConferenceRoomBooking.Infrastructure.Persistence.Rooms;
using ConferenceRoomBooking.Infrastructure.Persistence.Services;
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

        // Azure SQL drops connections now and then by design (failovers, maintenance, a serverless database waking up),
        // so transient errors are retried rather than failing the request (ADR 0008).
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString, sqlServer => sqlServer.EnableRetryOnFailure()));

        // Reports whether the database answers, for GET /health.
        services.AddHealthChecks().AddDbContextCheck<ApplicationDbContext>();

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IServiceRepository, ServiceRepository>();
        services.AddScoped<IRoomRepository, RoomRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IRoomBookingLock, SqlServerRoomBookingLock>();
        services.AddScoped<IReportQueries, ReportQueries>();
    }

    private static void AddIdentityServices(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<AdminAccountOptions>()
            .Bind(configuration.GetSection(AdminAccountOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services
            .AddOptions<DemoAccountsOptions>()
            .Bind(configuration.GetSection(DemoAccountsOptions.SectionName))
            .Validate(
                options => options.Accounts.All(account =>
                    Validator.TryValidateObject(account, new ValidationContext(account), null, validateAllProperties: true)),
                "Every demo account needs a label, a valid email, a password, and the role Admin or Client.")
            .ValidateOnStart();

        services.AddScoped<IdentitySeeder>();
        services.AddScoped<IIdentityService, IdentityService>();

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
