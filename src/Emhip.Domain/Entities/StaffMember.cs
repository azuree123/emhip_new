using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>A CMHW (Community Mental Health Worker) or Hub Manager.</summary>
public class StaffMember : Entity
{
    public Guid HubId { get; private set; }
    public string DisplayName { get; private set; } = default!;
    public string Email { get; private set; } = default!;
    public StaffRole Role { get; private set; }

    private StaffMember() { }

    public StaffMember(Guid hubId, string displayName, string email, StaffRole role)
    {
        HubId = hubId;
        DisplayName = displayName;
        Email = email;
        Role = role;
    }
}
