using ConferenceRoomBooking.Application.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ConferenceRoomBooking.Infrastructure.Identity;

/// <summary>
/// Creates the roles, the first Admin account, and any configured demo accounts if they don't exist yet.
/// Safe to run on every startup: existing roles and users are left unchanged.
/// </summary>
public sealed class IdentitySeeder(
    RoleManager<IdentityRole<Guid>> roleManager,
    UserManager<ApplicationUser> userManager,
    IOptions<AdminAccountOptions> adminAccountOptions,
    IOptions<DemoAccountsOptions> demoAccountsOptions,
    ILogger<IdentitySeeder> logger)
{
    private static readonly string[] RoleNames = [Roles.Admin, Roles.Client];

    public async Task SeedAsync()
    {
        // Read (and validate) the Admin settings first, so missing settings fail startup before anything is written.
        var adminAccount = adminAccountOptions.Value;

        await SeedRolesAsync();
        await SeedAdminAccountAsync(adminAccount);
        foreach (var demoAccount in demoAccountsOptions.Value.Accounts)
        {
            await SeedDemoAccountAsync(demoAccount);
        }
    }

    /// <summary>
    /// Demo accounts can't be locked out: their passwords are public, so anyone could otherwise lock reviewers out by
    /// entering wrong ones. Their password is reset to the configured one on every start.
    /// </summary>
    private async Task SeedDemoAccountAsync(DemoAccount account)
    {
        var user = await userManager.FindByEmailAsync(account.Email);
        if (user is null)
        {
            user = new ApplicationUser { UserName = account.Email, Email = account.Email, EmailConfirmed = true };
            EnsureSucceeded(await userManager.CreateAsync(user, account.Password), $"create the demo account {account.Email}");
            logger.LogInformation("Created demo account {Email}", account.Email);
        }
        else if (!await userManager.CheckPasswordAsync(user, account.Password))
        {
            EnsureSucceeded(await userManager.RemovePasswordAsync(user), $"reset the demo account {account.Email}");
            EnsureSucceeded(await userManager.AddPasswordAsync(user, account.Password), $"reset the demo account {account.Email}");
        }

        if (user.LockoutEnabled)
        {
            EnsureSucceeded(await userManager.SetLockoutEnabledAsync(user, false), $"turn off lockout for {account.Email}");
        }

        if (!await userManager.IsInRoleAsync(user, account.Role))
        {
            EnsureSucceeded(await userManager.AddToRoleAsync(user, account.Role), $"assign the {account.Role} role");
        }
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
