using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;

namespace ConferenceRoomBooking.IntegrationTests.Persistence;

/// <summary>
/// A migrated SQL Server database in a throwaway Docker container, shared by all persistence tests.
/// The database isn't reset between tests, so each test uses its own names and ids.
/// </summary>
public sealed class DatabaseFixture : IAsyncLifetime
{
    // Same image as docker-compose.yml.
    private readonly MsSqlContainer _database =
        new MsSqlBuilder("mcr.microsoft.com/mssql/server:2025-latest").Build();

    private DbContextOptions<ApplicationDbContext> _options = null!;

    public async Task InitializeAsync()
    {
        await _database.StartAsync();

        var connectionString = new SqlConnectionStringBuilder(_database.GetConnectionString())
        {
            InitialCatalog = "ConferenceRoomBookingPersistenceTests",
        }.ConnectionString;
        _options = new DbContextOptionsBuilder<ApplicationDbContext>().UseSqlServer(connectionString).Options;

        await using var dbContext = CreateDbContext();
        await dbContext.Database.MigrateAsync();
    }

    /// <summary>A new context with an empty change tracker, like the one each request gets.</summary>
    public ApplicationDbContext CreateDbContext() => new(_options);

    public Task DisposeAsync() => _database.DisposeAsync().AsTask();
}

[CollectionDefinition(nameof(DatabaseCollection))]
public sealed class DatabaseCollection : ICollectionFixture<DatabaseFixture>;
