namespace Emhip.Domain.Authorization;

/// <summary>The three built-in ApplicationRole names, shared by IdentitySeeder (API startup) and Emhip.Seeder (synthetic-data tool) so both agree on role naming without one referencing the other.</summary>
public static class RoleNames
{
    public const string Cmhw = "Cmhw";
    public const string HubManager = "HubManager";
    public const string Admin = "Admin";
}
