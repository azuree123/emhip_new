using Emhip.Domain.Common;

namespace Emhip.Domain.Entities;

/// <summary>
/// One urgent-flag lifecycle for a guest: opened when risk flags escalate the guest, optionally
/// escalated onward to a CMHT, and closed by an explicit resolution. The active urgent-cases
/// list stays on UrgentCases_ReadModel; episodes are the durable write-side record backing the
/// "Urgent Episode Record" panel and the resolved-episodes history.
/// </summary>
public class UrgentEpisode : Entity
{
    public Guid GuestId { get; private set; }
    public DateTimeOffset RaisedAt { get; private set; }

    public DateTimeOffset? EscalatedToCmhtAt { get; private set; }
    public Guid? EscalatedToCmhtByStaffId { get; private set; }
    public string? CmhtTeam { get; private set; }
    public string? EscalationReason { get; private set; }
    public string? EscalationUrgency { get; private set; }
    public string? EscalationNotes { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }
    public Guid? ResolvedByStaffId { get; private set; }
    public string? ResolutionNote { get; private set; }

    public bool IsResolved => ResolvedAt is not null;

    private UrgentEpisode() { }

    public UrgentEpisode(Guid guestId, DateTimeOffset raisedAt)
    {
        GuestId = guestId;
        RaisedAt = raisedAt;
    }

    public void EscalateToCmht(Guid staffId, string cmhtTeam, string? reason, string? urgency, string? notes)
    {
        EscalatedToCmhtAt = DateTimeOffset.UtcNow;
        EscalatedToCmhtByStaffId = staffId;
        CmhtTeam = cmhtTeam;
        EscalationReason = reason;
        EscalationUrgency = urgency;
        EscalationNotes = notes;
    }

    public void Resolve(Guid staffId, string? note)
    {
        ResolvedAt = DateTimeOffset.UtcNow;
        ResolvedByStaffId = staffId;
        ResolutionNote = note;
    }
}
