using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// One row of the Hub Manager's MDT queue (design Frame 54). Raised by a casework note's
/// "Refer this guest to the CPN" / "Add this guest for MDT discussion" toggles, or by an intake
/// that needs review; resolved by the manager confirming a CPN, declining with a reason, or
/// marking the item as discussed. Resolved items stay as the permanent MDT record for the guest.
/// </summary>
public class MdtQueueItem : AggregateRoot
{
    public Guid GuestId { get; private set; }
    public MdtQueueKind Kind { get; private set; }
    public MdtQueueStatus Status { get; private set; }

    public Guid RequestedByStaffId { get; private set; }
    public DateTimeOffset RequestedAt { get; private set; }

    /// <summary>Primary reason (CPN referral) / reason for requesting discussion / why the intake needs review.</summary>
    public string Reason { get; private set; } = default!;
    /// <summary>Rationale / what the team should consider — becomes part of the permanent record.</summary>
    public string? Details { get; private set; }
    /// <summary>CPN referrals only: "Routine — discuss at next MDT" or "Urgent — Hub Manager today".</summary>
    public string? Urgency { get; private set; }
    /// <summary>The casework note that raised the request, when there is one.</summary>
    public Guid? SourceNoteId { get; private set; }

    public Guid? ReviewedByStaffId { get; private set; }
    public DateTimeOffset? ReviewedAt { get; private set; }
    /// <summary>Confirmation note for the CPN handover, the MDT note, or the decline context.</summary>
    public string? ReviewNote { get; private set; }
    /// <summary>The CPN allocated when a referral is confirmed.</summary>
    public Guid? AssignedCpnStaffId { get; private set; }
    public string? DeclineReason { get; private set; }

    private MdtQueueItem() { }

    public MdtQueueItem(Guid guestId, MdtQueueKind kind, Guid requestedByStaffId, string reason, string? details, string? urgency, Guid? sourceNoteId)
    {
        GuestId = guestId;
        Kind = kind;
        Status = MdtQueueStatus.Pending;
        RequestedByStaffId = requestedByStaffId;
        RequestedAt = DateTimeOffset.UtcNow;
        Reason = reason;
        Details = details;
        Urgency = urgency;
        SourceNoteId = sourceNoteId;
    }

    public bool IsPending => Status == MdtQueueStatus.Pending;

    /// <summary>"Confirm assign CPN" — only a pending CPN referral can be confirmed.</summary>
    public void ConfirmCpn(Guid reviewerStaffId, Guid cpnStaffId, string? note)
    {
        if (Kind != MdtQueueKind.CpnReferral) throw new InvalidOperationException("Only a CPN referral can be confirmed.");
        EnsurePending();
        Status = MdtQueueStatus.Confirmed;
        AssignedCpnStaffId = cpnStaffId;
        ReviewNote = note;
        Stamp(reviewerStaffId);
    }

    /// <summary>"Decline with reason" — the reason is documented and the guest stays on CMHW-only support.</summary>
    public void Decline(Guid reviewerStaffId, string reason, string? context)
    {
        EnsurePending();
        Status = MdtQueueStatus.Declined;
        DeclineReason = reason;
        ReviewNote = context;
        Stamp(reviewerStaffId);
    }

    /// <summary>"Mark as discussed" — the MDT note is required and becomes the record of the discussion.</summary>
    public void MarkDiscussed(Guid reviewerStaffId, string mdtNote)
    {
        if (Kind == MdtQueueKind.CpnReferral) throw new InvalidOperationException("A CPN referral is confirmed or declined, not marked as discussed.");
        EnsurePending();
        Status = MdtQueueStatus.Discussed;
        ReviewNote = mdtNote;
        Stamp(reviewerStaffId);
    }

    private void EnsurePending()
    {
        if (!IsPending) throw new InvalidOperationException("This MDT item has already been reviewed.");
    }

    private void Stamp(Guid reviewerStaffId)
    {
        ReviewedByStaffId = reviewerStaffId;
        ReviewedAt = DateTimeOffset.UtcNow;
    }
}
