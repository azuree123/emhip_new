using Microsoft.AspNetCore.Identity;

namespace Emhip.Infrastructure.Identity;

/// <summary>
/// A staff member (CMHW or Hub Manager), authenticated via ASP.NET Core Identity. Replaces the
/// earlier standalone StaffMember entity — the same Guid id is used everywhere a "staff id" is
/// referenced (Guest.AssignedCmhwId, Contact.CreatedByStaffId, etc.), those columns are plain
/// Guids with no EF-level FK, so this swap doesn't touch their schema.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = default!;
    public Guid HubId { get; set; }
    public bool IsActive { get; set; } = true;
}
