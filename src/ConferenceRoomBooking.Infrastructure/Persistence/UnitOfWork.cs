using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Domain.Rooms;
using ConferenceRoomBooking.Domain.Services;
using ConferenceRoomBooking.Infrastructure.Persistence.Configurations;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence;

/// <summary>
/// <see cref="IUnitOfWork"/> implemented with EF Core.
/// </summary>
public sealed class UnitOfWork(ApplicationDbContext dbContext) : IUnitOfWork
{
    private const int DuplicateKeyInUniqueIndex = 2601;
    private const int DuplicateKeyInUniqueConstraint = 2627;

    private static readonly Dictionary<string, Error> ErrorsByUniqueIndex = new()
    {
        [RoomConfiguration.NameIndex] = RoomErrors.NameTaken,
        [ServiceConfiguration.NameIndex] = ServiceErrors.NameTaken,
    };

    public async Task<Result> SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            return Result.Success;
        }
        catch (DbUpdateException exception) when (FindUniqueNameError(exception) is { } error)
        {
            // Another request took the name between the use case's check and this save.
            return error;
        }
    }

    private static Error? FindUniqueNameError(DbUpdateException exception)
    {
        if (exception.InnerException is not SqlException
            {
                Number: DuplicateKeyInUniqueIndex or DuplicateKeyInUniqueConstraint,
            } sqlException)
        {
            return null;
        }

        // SQL Server names the violated index only in the message.
        return ErrorsByUniqueIndex
            .Where(entry => sqlException.Message.Contains($"'{entry.Key}'", StringComparison.Ordinal))
            .Select(entry => entry.Value)
            .FirstOrDefault();
    }
}
