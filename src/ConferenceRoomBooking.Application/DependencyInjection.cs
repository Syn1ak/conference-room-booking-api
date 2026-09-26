using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Application.Bookings;
using ConferenceRoomBooking.Application.Reports;
using ConferenceRoomBooking.Application.Rooms;
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
        services.AddScoped<RoomService>();
        services.AddScoped<BookingService>();
        services.AddScoped<ReportService>();

        return services;
    }
}
