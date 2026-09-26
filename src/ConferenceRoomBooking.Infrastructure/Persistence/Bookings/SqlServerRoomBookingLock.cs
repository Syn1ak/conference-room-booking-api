using System.Data;
using ConferenceRoomBooking.Application.Bookings;
using ConferenceRoomBooking.Domain.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ConferenceRoomBooking.Infrastructure.Persistence.Bookings;

/// <summary>
/// <see cref="IRoomBookingLock"/> implemented with a SQL Server application lock per room. The database holds the
/// lock, so it also works across several instances of the API.
/// </summary>
public sealed class SqlServerRoomBookingLock(ApplicationDbContext dbContext) : IRoomBookingLock
{
    private const int TimedOut = -1;

    private static readonly TimeSpan LockTimeout = TimeSpan.FromSeconds(10);

    public Task<Result<TValue>> RunExclusiveAsync<TValue>(
        Guid roomId,
        Func<CancellationToken, Task<Result<TValue>>> action,
        CancellationToken cancellationToken)
    {
        // A transaction we open ourselves must run inside the execution strategy, so that database retries,
        // when enabled, repeat the whole unit instead of failing.
        var strategy = dbContext.Database.CreateExecutionStrategy();

        return strategy.ExecuteAsync(
            async token =>
            {
                // Entities a failed attempt added are still tracked; without this, a retry would save them again.
                dbContext.ChangeTracker.Clear();

                await using var transaction = await dbContext.Database.BeginTransactionAsync(token);
                await AcquireAsync(roomId, token);

                var result = await action(token);
                if (result.IsSuccess)
                {
                    await transaction.CommitAsync(token);
                }
                else
                {
                    await transaction.RollbackAsync(token);
                }

                return result;
            },
            cancellationToken);
    }

    /// <summary>Takes the room's lock until the current transaction ends.</summary>
    private async Task AcquireAsync(Guid roomId, CancellationToken cancellationToken)
    {
        var returnCode = new SqlParameter("@returnCode", SqlDbType.Int) { Direction = ParameterDirection.Output };

        await dbContext.Database.ExecuteSqlRawAsync(
            """
            EXEC @returnCode = sp_getapplock
                @Resource = @resource, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = @timeout
            """,
            [
                returnCode,
                new SqlParameter("@resource", $"room-bookings:{roomId}"),
                new SqlParameter("@timeout", (int)LockTimeout.TotalMilliseconds),
            ],
            cancellationToken);

        // 0 and 1 mean the lock was granted, at once or after waiting. Anything below 0 means it wasn't.
        var code = (int)returnCode.Value;
        if (code == TimedOut)
        {
            // Not a TimeoutException: database retries treat that as transient, and retrying a lock that stayed held
            // this long would keep the request waiting for minutes.
            throw new InvalidOperationException(
                $"Room {roomId} stayed locked by another booking for more than {LockTimeout.TotalSeconds:0} seconds.");
        }

        if (code < 0)
        {
            throw new InvalidOperationException($"Couldn't lock room {roomId} for booking: sp_getapplock returned {code}.");
        }
    }
}
