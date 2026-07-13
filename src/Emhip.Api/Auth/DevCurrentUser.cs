using Emhip.Application.Abstractions;
using Emhip.Domain.Enums;

namespace Emhip.Api.Auth;

/// <summary>
/// Dev-mode ICurrentUser: reads the signed-in staff member from request headers instead of an
/// OIDC token, mirroring the prototype's role/screen switcher. Swap for a claims-based
/// implementation backed by Entra ID once a real tenant is available — nothing else in
/// Application or Infrastructure needs to change, they only depend on ICurrentUser.
/// </summary>
public sealed class DevCurrentUser : ICurrentUser
{
    public const string StaffIdHeader = "X-Dev-Staff-Id";
    public const string HubIdHeader = "X-Dev-Hub-Id";
    public const string DisplayNameHeader = "X-Dev-Display-Name";
    public const string RoleHeader = "X-Dev-Role";

    // Stable defaults so the app works out of the box before the seeder has run / before the
    // Angular client sends its role-switcher headers.
    public static readonly Guid DefaultStaffId = new("11111111-1111-1111-1111-111111111111");
    public static readonly Guid DefaultHubId = new("22222222-2222-2222-2222-222222222222");

    public Guid StaffId { get; }
    public Guid HubId { get; }
    public string DisplayName { get; }
    public StaffRole Role { get; }

    public DevCurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        var request = httpContextAccessor.HttpContext?.Request;

        StaffId = TryParseGuid(request?.Headers[StaffIdHeader].ToString()) ?? DefaultStaffId;
        HubId = TryParseGuid(request?.Headers[HubIdHeader].ToString()) ?? DefaultHubId;
        DisplayName = request?.Headers[DisplayNameHeader].ToString() is { Length: > 0 } name ? name : "Demo CMHW";
        Role = Enum.TryParse<StaffRole>(request?.Headers[RoleHeader].ToString(), out var role) ? role : StaffRole.Cmhw;
    }

    private static Guid? TryParseGuid(string? value) => Guid.TryParse(value, out var id) ? id : null;
}
