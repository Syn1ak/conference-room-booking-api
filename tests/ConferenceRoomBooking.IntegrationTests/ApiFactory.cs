using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ConferenceRoomBooking.Api.Auth;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;

namespace ConferenceRoomBooking.IntegrationTests;

/// <summary>
/// Runs the API in memory against a real SQL Server in a throwaway Docker container.
/// Like a deployment, the schema is migrated before the API starts.
/// All API tests share one instance, and the database isn't reset between tests, so each test uses its own names,
/// accounts, and time slots.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AdminEmail = "admin@integration.test";
    public const string AdminPassword = "Admin123!";

    // Same image as docker-compose.yml.
    private readonly MsSqlContainer _database =
        new MsSqlBuilder("mcr.microsoft.com/mssql/server:2025-latest").Build();

    private string _connectionString = string.Empty;

    public async Task InitializeAsync()
    {
        await _database.StartAsync();

        _connectionString = new SqlConnectionStringBuilder(_database.GetConnectionString())
        {
            InitialCatalog = "ConferenceRoomBookingTests",
        }.ConnectionString;

        await using var dbContext = new ApplicationDbContext(
            new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(_connectionString).Options);
        await dbContext.Database.MigrateAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not Development: no automatic migrations and no user-secrets from the developer's machine.
        builder.UseEnvironment("Testing");

        builder.UseSetting("ConnectionStrings:DefaultConnection", _connectionString);
        builder.UseSetting("Jwt:SigningKey", "integration-tests-signing-key-with-at-least-32-characters");
        builder.UseSetting("AdminAccount:Email", AdminEmail);
        builder.UseSetting("AdminAccount:Password", AdminPassword);

        // Every test request comes from the same in-memory client; don't let rate limits interfere.
        builder.UseSetting("RateLimiting:GlobalPermitLimit", "10000");
        builder.UseSetting("RateLimiting:AuthenticationPermitLimit", "10000");
    }

    /// <summary>A client that sends the seeded admin's access token.</summary>
    public Task<HttpClient> LoginAsAdminAsync() => LoginAsync(AdminEmail, AdminPassword);

    /// <summary>Registers a new Client account and returns a client that sends its access token.</summary>
    public async Task<HttpClient> LoginAsNewClientAsync()
    {
        const string password = "Client123!";
        var email = $"client-{Guid.NewGuid():N}@integration.test";

        using var anonymous = CreateClient();
        var response = await anonymous.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return await LoginAsync(email, password);
    }

    private async Task<HttpClient> LoginAsync(string email, string password)
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var login = await response.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.AccessToken);
        return client;
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }
}

[CollectionDefinition(nameof(ApiCollection))]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>;
