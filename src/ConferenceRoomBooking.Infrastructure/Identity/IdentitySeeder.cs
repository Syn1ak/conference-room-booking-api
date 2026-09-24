using ConferenceRoomBooking.Application.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// Creates the roles and the first Admin account if they don't exist yet.
/// Safe to run on every startup: existing roles and users are left unchanged.
/// </summary>
public sealed class IdentitySeeder(
    RoleManager<IdentityRole<Guid>> roleManager,
    UserManager<ApplicationUser> userManager,
    IOptions<AdminAccountOptions> adminAccountOptions,
    ILogger<IdentitySeeder> logger)
{
    private static readonly string[] RoleNames = [Roles.Admin, Roles.Client];

    public async Task SeedAsync()
    {
        // Read (and validate) the Admin settings first, so missing settings fail startup before anything is written.
        var adminAccount = adminAccountOptions.Value;

        await SeedRolesAsync();
        await SeedAdminAccountAsync(adminAccount);
    }

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in RoleNames)
        {
            if (await roleManager.RoleExistsAsync(roleName))
            {
                continue;
            }

            EnsureSucceeded(await roleManager.CreateAsync(new IdentityRole<Guid>(roleName)), $"create role '{roleName}'");
            logger.LogInformation("Created role {RoleName}", roleName);
        }
    }

    private async Task SeedAdminAccountAsync(AdminAccountOptions options)
    {
        var admin = await userManager.FindByEmailAsync(options.Email);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                UserName = options.Email,
                Email = options.Email,
                EmailConfirmed = true,
            };

            EnsureSucceeded(await userManager.CreateAsync(admin, options.Password), "create the Admin account");
            logger.LogInformation("Created Admin account {Email}", options.Email);
        }

        if (!await userManager.IsInRoleAsync(admin, Roles.Admin))
        {
            EnsureSucceeded(await userManager.AddToRoleAsync(admin, Roles.Admin), "assign the Admin role");
        }
    }

    private static void EnsureSucceeded(IdentityResult result, string action)
    {
        if (result.Succeeded)
        {
            return;
        }

        var errors = string.Join(" ", result.Errors.Select(error => error.Description));
        throw new InvalidOperationException($"Failed to {action}: {errors}");
    }
}
