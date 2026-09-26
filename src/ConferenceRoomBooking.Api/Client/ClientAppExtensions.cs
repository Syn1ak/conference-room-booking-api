using Microsoft.Net.Http.Headers;

namespace ConferenceRoomBooking.Api.Client;

public static class ClientAppExtensions
{
    /// <summary>
    /// Paths that belong to the API rather than the client: an unknown one is a 404, never the client's index.html.
    /// </summary>
    private static readonly string[] ServerPaths = ["/api", "/health", "/openapi", "/swagger"];

    /// <summary>
    /// The page's Content-Security-Policy. Scripts are held to the stricter policy that the build writes into
    /// index.html (hashes and 'strict-dynamic'); browsers enforce both, so this one only limits scripts to this
    /// origin. Styles allow inline because Angular inlines component styles. A meta tag can't say frame-ancestors.
    /// </summary>
    private const string ContentSecurityPolicy =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; " +
        "form-action 'self'; frame-ancestors 'none'";

    /// <summary>
    /// Serves the built Angular client from wwwroot, where publishing puts it, on the same origin as the API
    /// (ADR 0001). The hashed bundles are cached for a year; index.html is revalidated on every visit, so a deployment
    /// reaches users on their next page load, and carries the page's security headers. Without a built client,
    /// nothing is served.
    /// </summary>
    public static WebApplication UseClientApp(this WebApplication app)
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            OnPrepareResponse = context =>
            {
                var isIndex = context.File.Name == "index.html";
                context.Context.Response.Headers.CacheControl =
                    isIndex ? "no-cache" : "public, max-age=31536000, immutable";
                AddSecurityHeaders(context.Context.Response, isIndex);
            },
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
                AddSecurityHeaders(context.Response, isPage: true);
                await context.Response.SendFileAsync(indexFile);
            })
            .AllowAnonymous()
            .DisableRateLimiting();

    private static void AddSecurityHeaders(HttpResponse response, bool isPage)
    {
        response.Headers.XContentTypeOptions = "nosniff";
        if (isPage)
        {
            response.Headers.ContentSecurityPolicy = ContentSecurityPolicy;
            response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
        }
    }

    private static bool IsServerPath(PathString path) =>
        ServerPaths.Any(serverPath => path.StartsWithSegments(serverPath, StringComparison.OrdinalIgnoreCase));
}
