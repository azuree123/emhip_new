using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>A referral into one of the Reports-screen pathway categories.</summary>
public class PathwayReferral : Entity
{
    public Guid GuestId { get; private set; }
    public PathwayCategory Category { get; private set; }
    public string? Detail { get; private set; }
    public PathwayStatus Status { get; private set; }
    public Guid ReferredByStaffId { get; private set; }
    public DateTimeOffset ReferredAt { get; private set; }

    private PathwayReferral() { }

    public PathwayReferral(Guid guestId, PathwayCategory category, string? detail, Guid referredByStaffId)
    {
        GuestId = guestId;
        Category = category;
        Detail = detail;
        ReferredByStaffId = referredByStaffId;
        Status = PathwayStatus.Referred;
        ReferredAt = DateTimeOffset.UtcNow;
    }

    public void UpdateStatus(PathwayStatus status) => Status = status;
}
