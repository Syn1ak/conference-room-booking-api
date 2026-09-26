using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ConferenceRoomBooking.IntegrationTests.Resilience;

/// <summary>
/// Fails the first database command whose SQL contains <paramref name="sqlFragment"/>, as a dropped connection would,
/// and lets every other command through. SQL Server's retrying execution strategy treats a
/// <see cref="TimeoutException"/> as transient, so the failure triggers a real retry.
/// </summary>
internal sealed class FailOnceCommandInterceptor(string sqlFragment) : DbCommandInterceptor
{
    private int _failed;

    public bool HasFailed => _failed == 1;

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        FailOnce(command);
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        FailOnce(command);
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    private void FailOnce(DbCommand command)
    {
        if (command.CommandText.Contains(sqlFragment, StringComparison.Ordinal)
            && Interlocked.CompareExchange(ref _failed, 1, 0) == 0)
        {
            throw new TimeoutException($"Simulated transient failure of a command containing '{sqlFragment}'.");
        }
    }
}
