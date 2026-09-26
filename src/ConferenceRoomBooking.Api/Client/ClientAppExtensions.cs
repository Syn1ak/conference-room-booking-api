using Microsoft.Net.Http.Headers;

namespace ConferenceRoomBooking.Api.Client;

public static class ClientAppExtensions
{
    /// <summary>
    /// Paths that belong to the API rather than the client: an unknown one is a 404, never the client's index.html.
    /// </summary>
    private static readonly string[] ServerPaths = ["/api", "/health", "/openapi", "/swagger"];

    /// <summary>
    /// Serves the built Angular client from wwwroot, where publishing puts it, on the same origin as the API
    /// (ADR 0001). The hashed bundles are cached for a year; index.html is revalidated on every visit, so a deployment
    /// reaches users on their next page load. Without a built client, nothing is served.
    /// </summary>
    public static WebApplication UseClientApp(this WebApplication app)
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = context => context.Context.Response.Headers.CacheControl =
                context.File.Name == "index.html" ? "no-cache" : "public, max-age=31536000, immutable",
        });

        return app;
    }

    /// <summary>
    /// Answers client routes such as /bookings/{id} with index.html, so a link to any page of the client works on a
    /// fresh load. Unknown API and documentation paths get a 404 ProblemDetails instead, signed in or not.
    /// </summary>
    public static IEndpointConventionBuilder MapClientAppFallback(this WebApplication app) =>
        app.MapFallback(async context =>
            {
                var indexFile = app.Environment.WebRootFileProvider.GetFileInfo("index.html");
                if (IsServerPath(context.Request.Path) || !indexFile.Exists)
                {
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    return;
                }

                context.Response.ContentType = "text/html; charset=utf-8";
                context.Response.Headers[HeaderNames.CacheControl] = "no-cache";
                await context.Response.SendFileAsync(indexFile);
            })
            .AllowAnonymous()
            .DisableRateLimiting();

    private static bool IsServerPath(PathString path) =>
        ServerPaths.Any(serverPath => path.StartsWithSegments(serverPath, StringComparison.OrdinalIgnoreCase));
}
