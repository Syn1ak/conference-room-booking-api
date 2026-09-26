using ConferenceRoomBooking.Application.Common;
using Microsoft.Extensions.Options;

namespace ConferenceRoomBooking.Api.Venue;

public static class VenueServiceCollectionExtensions
{
    /// <summary>
    /// Makes the venue's time zone from configuration available as <see cref="VenueTimeZone"/>.
    /// An unknown time zone id stops the app at startup.
    /// </summary>
    public static IServiceCollection AddVenueTimeZone(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<VenueOptions>()
            .Bind(configuration.GetSection(VenueOptions.SectionName))
            .ValidateDataAnnotations()
            .Validate(
                options => TimeZoneInfo.TryFindSystemTimeZoneById(options.TimeZone, out _),
                $"{VenueOptions.SectionName}:{nameof(VenueOptions.TimeZone)} isn't a time zone known to this system.")
            .ValidateOnStart();

        services.AddSingleton(provider => new VenueTimeZone(
            TimeZoneInfo.FindSystemTimeZoneById(provider.GetRequiredService<IOptions<VenueOptions>>().Value.TimeZone)));

        return services;
    }
}
