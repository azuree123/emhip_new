using Emhip.Domain.Enums;

namespace Emhip.Application.Abstractions;

/// <summary>
/// The signed-in staff member. Implemented by dev-auth in Emhip.Api for now (a role/user
/// switcher, mirroring the prototype's screen switcher) — swap for a real OIDC/Entra ID
/// claims-backed implementation without touching Application or Infrastructure.
/// </summary>
public interface ICurrentUser
{
    Guid StaffId { get; }
    Guid HubId { get; }
    string DisplayName { get; }
    StaffRole Role { get; }
}
