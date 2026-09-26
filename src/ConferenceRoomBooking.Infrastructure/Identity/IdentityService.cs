using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Domain.Common;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// <see cref="IIdentityService"/> implemented with ASP.NET Core Identity.
/// </summary>
public sealed class IdentityService(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext dbContext,
    ILogger<IdentityService> logger) : IIdentityService
{
    private static readonly string[] DuplicateAccountErrorCodes =
    [
        nameof(IdentityErrorDescriber.DuplicateEmail),
        nameof(IdentityErrorDescriber.DuplicateUserName),
    ];

    public async Task<Result<Guid>> CreateUserAsync(string email, string password, string role, CancellationToken cancellationToken)
    {
        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        // Creating the user and assigning the role must succeed or fail together. A transaction we open ourselves must
        // run inside the execution strategy, so that database retries repeat the whole unit instead of failing.
        var strategy = dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync<Result<Guid>>(
            async token =>
            {
                // A failed attempt's user is still tracked; without this, a retry would insert it again.
                dbContext.ChangeTracker.Clear();

                await using var transaction = await dbContext.Database.BeginTransactionAsync(token);

                var user = new ApplicationUser { UserName = email, Email = email };
                var createResult = await userManager.CreateAsync(user, password);
                if (!createResult.Succeeded)
                {
                    return ToError(createResult.Errors);
                }

                var roleResult = await userManager.AddToRoleAsync(user, role);
                if (!roleResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Failed to assign role '{role}': {string.Join(" ", roleResult.Errors.Select(error => error.Description))}");
                }

                await transaction.CommitAsync(token);

                return user.Id;
            },
            cancellationToken);
    }

    public async Task<Result<UserAccount>> CheckCredentialsAsync(string email, string password)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            // Hash the password anyway, so an unknown email takes as long as a wrong password
            // and response times don't reveal which accounts exist.
            userManager.PasswordHasher.HashPassword(new ApplicationUser(), password);
            return AuthErrors.InvalidCredentials;
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            return AuthErrors.InvalidCredentials;
        }

        if (!await userManager.CheckPasswordAsync(user, password))
        {
            // Counts towards lockout; the account locks after the configured number of failures.
            await userManager.AccessFailedAsync(user);
            if (await userManager.IsLockedOutAsync(user))
            {
                logger.LogWarning("Account {UserId} locked out after repeated failed logins", user.Id);
            }

            return AuthErrors.InvalidCredentials;
        }

        await userManager.ResetAccessFailedCountAsync(user);

        var roles = await userManager.GetRolesAsync(user);

        return new UserAccount(user.Id, user.Email!, [.. roles]);
    }

    /// <summary>
    /// Translates Identity's errors into an application error, grouping the messages by input field.
    /// </summary>
    private static Error ToError(IEnumerable<IdentityError> identityErrors)
    {
        var errors = identityErrors.ToList();

        // A concurrent registration with the same email can slip past the check above.
        if (errors.Any(error => DuplicateAccountErrorCodes.Contains(error.Code)))
        {
            return AuthErrors.EmailAlreadyRegistered;
        }

        var fieldErrors = errors
            .GroupBy(error => FieldFor(error.Code))
            .ToDictionary(group => group.Key, group => group.Select(error => error.Description).ToArray());

        return AuthErrors.InvalidRegistration(fieldErrors);
    }

    private static string FieldFor(string identityErrorCode) => identityErrorCode switch
    {
        _ when identityErrorCode.StartsWith("Password", StringComparison.Ordinal) => "Password",
        nameof(IdentityErrorDescriber.InvalidEmail) or nameof(IdentityErrorDescriber.InvalidUserName) => "Email",
        _ => string.Empty,
    };
}
