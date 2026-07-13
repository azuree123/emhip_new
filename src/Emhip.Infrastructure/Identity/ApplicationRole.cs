using Microsoft.AspNetCore.Identity;

namespace Emhip.Infrastructure.Identity;

/// <summary>
/// A named role (e.g. "Cmhw", "HubManager", "Admin"). Permissions are attached as RoleClaims
/// (ClaimType = Permissions.ClaimType) rather than being hardcoded per role — see
/// IdentitySeeder for the default roles and Emhip.Domain.Authorization.Permissions for the
/// catalog. Editable at runtime via the admin role-management screens.
/// </summary>
public class ApplicationRole : IdentityRole<Guid>
{
    public ApplicationRole() { }

    public ApplicationRole(string name) : base(name) { }

    public string? Description { get; set; }
}
