using Emhip.Domain.Authorization;
using Emhip.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace Emhip.Api.Auth;

/// <summary>
/// Ensures the default roles (Cmhw, HubManager, Admin) exist with sensible permission sets, and
/// bootstraps a first Admin user if none exists yet — otherwise there'd be no way to log in and
/// create further users, since there's no self-registration by design (see README "Known gaps").
/// Runs once at API startup, idempotently.
/// </summary>
public static class IdentitySeeder
{
    public const string CmhwRole = RoleNames.Cmhw;
    public const string HubManagerRole = RoleNames.HubManager;
    public const string AdminRole = RoleNames.Admin;

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var configuration = services.GetRequiredService<IConfiguration>();

        await EnsureRoleAsync(roleManager, CmhwRole, "Community Mental Health Worker", CmhwPermissions);
        await EnsureRoleAsync(roleManager, HubManagerRole, "Hub Manager", HubManagerPermissions);
        await EnsureRoleAsync(roleManager, AdminRole, "Administrator", Permissions.All);

        if (userManager.Users.Any()) return;

        var adminEmail = configuration["Bootstrap:AdminEmail"] ?? "admin@emhip.local";
        var adminPassword = configuration["Bootstrap:AdminPassword"] ?? "ChangeMe!2026";
        var adminHubId = Guid.TryParse(configuration["Bootstrap:AdminHubId"], out var hubId) ? hubId : Guid.NewGuid();

        var admin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
            DisplayName = "System Administrator",
            HubId = adminHubId,
        };

        var result = await userManager.CreateAsync(admin, adminPassword);
        if (result.Succeeded)
        {
            await userManager.AddToRoleAsync(admin, AdminRole);
        }
    }

    private static readonly string[] CmhwPermissions =
    [
        Permissions.Dashboard.ViewCmhw,
        Permissions.Guests.View, Permissions.Guests.Register, Permissions.Guests.Edit,
        Permissions.Guests.DemographicsView, Permissions.Guests.DemographicsEdit,
        Permissions.Guests.ClinicalView, Permissions.Guests.ClinicalEdit,
        Permissions.Guests.PathwayView, Permissions.Guests.PathwayEdit,
        Permissions.Guests.NotesView, Permissions.Guests.NotesAdd, Permissions.Guests.ContactsAdd,
        Permissions.FollowUps.View, Permissions.FollowUps.Manage,
        Permissions.UrgentCases.View,
        Permissions.Reports.View,
    ];

    private static readonly string[] HubManagerPermissions = [.. CmhwPermissions, Permissions.Dashboard.ViewHubManager, Permissions.Reports.Export];

    private static async Task EnsureRoleAsync(RoleManager<ApplicationRole> roleManager, string name, string description, IReadOnlyList<string> permissions)
    {
        var role = await roleManager.FindByNameAsync(name);
        if (role is null)
        {
            role = new ApplicationRole(name) { Description = description };
            await roleManager.CreateAsync(role);
        }

        var existingClaims = await roleManager.GetClaimsAsync(role);
        var existingPermissions = existingClaims.Where(c => c.Type == Permissions.ClaimType).Select(c => c.Value).ToHashSet();

        foreach (var permission in permissions.Where(p => !existingPermissions.Contains(p)))
        {
            await roleManager.AddClaimAsync(role, new System.Security.Claims.Claim(Permissions.ClaimType, permission));
        }
    }
}
