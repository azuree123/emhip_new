namespace Emhip.Api.Auth;

/// <summary>Names of the rate-limiting policies registered in Program.cs.</summary>
public static class RateLimitPolicies
{
    /// <summary>Anonymous authentication endpoints: login, forgot-password, reset-password.</summary>
    public const string Auth = "auth";
}
