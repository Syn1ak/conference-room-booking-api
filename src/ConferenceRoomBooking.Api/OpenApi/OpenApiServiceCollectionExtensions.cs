namespace ConferenceRoomBooking.Api.OpenApi;

public static class OpenApiServiceCollectionExtensions
{
    /// <summary>
    /// Generates the OpenAPI document, including JWT bearer authentication, for Swagger UI.
    /// </summary>
    public static IServiceCollection AddApiDocumentation(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info.Title = "Conference Room Booking API";
                document.Info.Description = "Search, book, and manage conference rooms.";
                return Task.CompletedTask;
            });
            options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
            options.AddOperationTransformer<BearerSecurityRequirementTransformer>();
        });

        return services;
    }
}
