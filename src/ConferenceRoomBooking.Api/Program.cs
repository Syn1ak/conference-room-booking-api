using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Api.OpenApi;
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

builder.Services.AddControllers();
builder.Services.AddApiDocumentation();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Keep the local database schema up to date. Deployed environments migrate during deployment instead.
    await app.Services.ApplyDatabaseMigrationsAsync();
}

await app.Services.SeedIdentityDataAsync();

app.UseHttpsRedirection();

// API documentation is served in every environment, so the deployed API can be explored in Swagger UI.
// Swagger UI's static files are served before authorization, so they aren't affected by the fallback policy.
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "Conference Room Booking API v1");
    options.DocumentTitle = "Conference Room Booking API";
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// The API description is public; without this the fallback policy would require a token to read it.
app.MapOpenApi().AllowAnonymous();

app.Run();
