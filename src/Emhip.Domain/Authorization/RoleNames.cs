namespace Emhip.Domain.Authorization;

/// <summary>The built-in ApplicationRole names, shared by IdentitySeeder (API startup) and Emhip.Seeder (synthetic-data tool) so both agree on role naming without one referencing the other.</summary>
public static class RoleNames
{
    public const string Cmhw = "Cmhw";
    /// <summary>Community Psychiatric Nurse — a CMHW-level role that may also log CPN contacts and assessments.</summary>
    public const string Cpn = "Cpn";
    public const string HubManager = "HubManager";
    public const string Admin = "Admin";
}
