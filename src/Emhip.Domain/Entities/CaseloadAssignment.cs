using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// An append-only record of CMHW allocation, so "reassignment must be logged" (spec §4.4) holds:
/// who the guest moved from, to whom, when and why.
/// </summary>
public class CaseloadAssignment : Entity
{
    public Guid GuestId { get; private set; }
    public Guid? FromStaffId { get; private set; }
    public Guid? ToStaffId { get; private set; }
    public string? Reason { get; private set; }
    public Guid RecordedByStaffId { get; private set; }
    public DateTimeOffset RecordedAt { get; private set; }

    private CaseloadAssignment() { }

    public CaseloadAssignment(Guid guestId, Guid? fromStaffId, Guid? toStaffId, string? reason, Guid recordedByStaffId)
    {
        GuestId = guestId;
        FromStaffId = fromStaffId;
        ToStaffId = toStaffId;
        Reason = reason;
        RecordedByStaffId = recordedByStaffId;
        RecordedAt = DateTimeOffset.UtcNow;
    }
}
