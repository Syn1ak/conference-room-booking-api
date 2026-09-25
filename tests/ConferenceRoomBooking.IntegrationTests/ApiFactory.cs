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

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }
}
