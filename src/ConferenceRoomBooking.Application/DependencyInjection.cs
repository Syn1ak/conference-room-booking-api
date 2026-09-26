using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.Application;

/// <summary>
/// Registers the Application layer's services in the dependency injection container.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        services.AddScoped<ServiceCatalogService>();

        return services;
    }
}
