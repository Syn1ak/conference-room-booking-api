using Microsoft.Extensions.DependencyInjection;

namespace ConferenceRoomBooking.Application;

/// <summary>
/// Registers the Application layer's services in the dependency injection container.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        return services;
    }
}
