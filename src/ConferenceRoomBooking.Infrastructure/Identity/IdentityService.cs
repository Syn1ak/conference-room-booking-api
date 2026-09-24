using ConferenceRoomBooking.Application.Auth;
using ConferenceRoomBooking.Application.Common;
using ConferenceRoomBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// <see cref="IIdentityService"/> implemented with ASP.NET Core Identity.
/// </summary>
public sealed class IdentityService(UserManager<ApplicationUser> userManager, ApplicationDbContext dbContext) : IIdentityService
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

        var user = new ApplicationUser { UserName = email, Email = email };

        // Creating the user and assigning the role must succeed or fail together.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

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

        await transaction.CommitAsync(cancellationToken);

        return user.Id;
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
