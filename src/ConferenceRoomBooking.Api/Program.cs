using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.Common;
using ConferenceRoomBooking.Api.OpenApi;
using ConferenceRoomBooking.Api.RateLimiting;
using ConferenceRoomBooking.Api.Venue;
using ConferenceRoomBooking.Application;
using ConferenceRoomBooking.Infrastructure;
using ConferenceRoomBooking.Infrastructure.Identity;
using ConferenceRoomBooking.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication();
builder.Services.AddCurrentUser();
builder.Services.AddAuthorizationPolicies();
builder.Services.AddApiRateLimiting(builder.Configuration);
builder.Services.AddVenueTimeZone(builder.Configuration);

builder.Services.AddControllers(options =>
{
    // Times in the query string must carry a UTC offset (ADR 0003).
    options.ModelBinderProviders.Insert(0, new OffsetRequiredDateTimeOffsetBinderProvider());
});
builder.Services.AddApiDocumentation();

// Every error response, including unhandled exceptions and bare status codes, is RFC 7807 ProblemDetails with a trace id.
builder.Services.AddProblemDetails();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Keep the local database schema up to date. Deployed environments migrate during deployment instead.
    await app.Services.ApplyDatabaseMigrationsAsync();
}

await app.Services.SeedIdentityDataAsync();

if (!app.Environment.IsDevelopment())
{
    // Unhandled exceptions return a generic 500 ProblemDetails; details stay in the logs.
    // In Development, the built-in developer exception page returns them with the stack trace instead.
    app.UseExceptionHandler();

    // Tell browsers to use only HTTPS for this host. Not in Development, where it would stick to localhost.
    app.UseHsts();
}

// Adds a ProblemDetails body to error responses that have none, such as 401 or 404.
app.UseStatusCodePages();

app.UseHttpsRedirection();

// API documentation is served in every environment, so the deployed API can be explored in Swagger UI.
// Swagger UI's static files are served before authorization, so they aren't affected by the fallback policy.
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "Conference Room Booking API v1");
    options.DocumentTitle = "Conference Room Booking API";
});

app.UseAuthentication();
// After authentication, so authenticated users are limited per account rather than per IP address.
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

// The API description is public; without this the fallback policy would require a token to read it.
app.MapOpenApi().AllowAnonymous();

app.Run();
