namespace Emhip.Application.Abstractions;

/// <summary>
/// The signed-in staff member, populated from the validated JWT's claims
/// (see Emhip.Api.Auth.CurrentUser). Permission enforcement itself happens at the API boundary
/// via policy-based `[Authorize]` attributes before a request ever reaches here — this is for
/// "who did this" stamping (audit trail, CreatedByStaffId, etc.) and any role-flavored display
/// logic that legitimately belongs in the domain/application layer.
/// </summary>
public interface ICurrentUser
{
    Guid StaffId { get; }
    Guid HubId { get; }
    string DisplayName { get; }
    IReadOnlyList<string> Roles { get; }
    IReadOnlyList<string> Permissions { get; }
}
