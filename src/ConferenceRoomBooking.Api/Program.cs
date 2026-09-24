using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Application;
using ConferenceRoomBooking.Infrastructure;
using ConferenceRoomBooking.Infrastructure.Identity;
using ConferenceRoomBooking.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication();
builder.Services.AddAuthorizationPolicies();

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Keep the local database schema up to date. Deployed environments migrate during deployment instead.
    await app.Services.ApplyDatabaseMigrationsAsync();

    // The API description is public; without this the fallback policy would require a token to read it.
    app.MapOpenApi().AllowAnonymous();
}

await app.Services.SeedIdentityDataAsync();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
