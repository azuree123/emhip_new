using System.Security.Claims;
using Emhip.Application.Abstractions;
using Emhip.Domain.Authorization;

namespace Emhip.Api.Auth;

/// <summary>Custom claim types carried on the JWT issued by TokenService — see JwtClaimTypes.HubId/DisplayName.</summary>
public static class JwtClaimTypes
{
    public const string HubId = "hub_id";
    public const string DisplayName = "display_name";
}

/// <summary>
/// Real ICurrentUser, populated from the validated JWT's ClaimsPrincipal (set by the JWT bearer
/// authentication middleware in Program.cs). Replaces the earlier header-based DevCurrentUser —
/// every claim here was put on the token by Emhip.Api.Auth.TokenService at login time.
/// </summary>
public sealed class CurrentUser : ICurrentUser
{
    public Guid StaffId { get; }
    public Guid HubId { get; }
    public string DisplayName { get; }
    public IReadOnlyList<string> Roles { get; }
    public IReadOnlyList<string> Permissions { get; }

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;

        StaffId = Guid.TryParse(user?.FindFirstValue(ClaimTypes.NameIdentifier), out var staffId) ? staffId : Guid.Empty;
        HubId = Guid.TryParse(user?.FindFirstValue(JwtClaimTypes.HubId), out var hubId) ? hubId : Guid.Empty;
        DisplayName = user?.FindFirstValue(JwtClaimTypes.DisplayName) ?? string.Empty;
        Roles = user?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray() ?? [];
        Permissions = user?.FindAll(Domain.Authorization.Permissions.ClaimType).Select(c => c.Value).ToArray() ?? [];
    }
}
