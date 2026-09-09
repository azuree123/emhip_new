using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// One urgent-flag lifecycle for a guest: opened when risk flags escalate the guest, optionally
/// escalated onward to a CMHT, and closed by an explicit resolution. The active urgent-cases
/// list stays on UrgentCases_ReadModel; episodes are the durable write-side record backing the
/// "Urgent Episode Record" screen and the resolved-episodes history.
///
/// The record snapshots the guest's pathway and CMHW at the moment the flag was raised and again
/// at resolution ("Pathway re-entry decision"), so the episode reads the same way years later
/// even after the guest's live record has moved on.
/// </summary>
public class UrgentEpisode : Entity
{
    public Guid GuestId { get; private set; }
    public DateTimeOffset RaisedAt { get; private set; }

    /// <summary>Who recorded the risk assessment that opened the episode; null for flags that pre-date episode tracking.</summary>
    public Guid? RaisedByStaffId { get; private set; }
    /// <summary>The risk assessment whose notes are the "Crisis action notes at intake".</summary>
    public Guid? RiskAssessmentId { get; private set; }
    public GuestPathway? PathwayAtFlag { get; private set; }
    public Guid? AssignedCmhwIdAtFlag { get; private set; }

    public DateTimeOffset? EscalatedToCmhtAt { get; private set; }
    public Guid? EscalatedToCmhtByStaffId { get; private set; }
    public string? CmhtTeam { get; private set; }
    public string? EscalationReason { get; private set; }
    public string? EscalationUrgency { get; private set; }
    public string? EscalationNotes { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }
    public Guid? ResolvedByStaffId { get; private set; }
    public string? ResolutionNote { get; private set; }

    // ---- Pathway re-entry decision (captured at resolution) ----
    public GuestPathway? PathwayAfterResolution { get; private set; }
    public Guid? CmhwAfterResolutionStaffId { get; private set; }
    public DateOnly? NextContactDate { get; private set; }
    /// <summary>Free text, e.g. "Yes — weekly CPN input added"; null when the frequency did not change.</summary>
    public string? SessionFrequencyChange { get; private set; }
    public bool InpatientAdmission { get; private set; }

    public bool IsResolved => ResolvedAt is not null;

    private UrgentEpisode() { }

    public UrgentEpisode(Guid guestId, DateTimeOffset raisedAt)
    {
        GuestId = guestId;
        RaisedAt = raisedAt;
    }

    public UrgentEpisode(
        Guid guestId, DateTimeOffset raisedAt, Guid? raisedByStaffId, Guid? riskAssessmentId,
        GuestPathway? pathwayAtFlag, Guid? assignedCmhwIdAtFlag)
        : this(guestId, raisedAt)
    {
        RaisedByStaffId = raisedByStaffId;
        RiskAssessmentId = riskAssessmentId;
        PathwayAtFlag = pathwayAtFlag;
        AssignedCmhwIdAtFlag = assignedCmhwIdAtFlag;
    }

    public void EscalateToCmht(Guid staffId, string cmhtTeam, string? reason, string? urgency, string? notes)
    {
        if (IsResolved) throw new InvalidOperationException("This urgent episode is resolved and locked.");
        EscalatedToCmhtAt = DateTimeOffset.UtcNow;
        EscalatedToCmhtByStaffId = staffId;
        CmhtTeam = cmhtTeam;
        EscalationReason = reason;
        EscalationUrgency = urgency;
        EscalationNotes = notes;
    }

    public void Resolve(Guid staffId, string? note) => Resolve(staffId, note, null, null, null, null, false);

    /// <summary>
    /// Closes the episode and records the pathway re-entry decision. A resolved episode is locked:
    /// resolving twice throws so the audit trail never shows a second "resolved" entry.
    /// </summary>
    public void Resolve(
        Guid staffId, string? note, GuestPathway? pathwayAfterResolution, Guid? cmhwAfterResolutionStaffId,
        DateOnly? nextContactDate, string? sessionFrequencyChange, bool inpatientAdmission)
    {
        if (IsResolved) throw new InvalidOperationException("This urgent episode is already resolved.");
        ResolvedAt = DateTimeOffset.UtcNow;
        ResolvedByStaffId = staffId;
        ResolutionNote = note;
        PathwayAfterResolution = pathwayAfterResolution;
        CmhwAfterResolutionStaffId = cmhwAfterResolutionStaffId;
        NextContactDate = nextContactDate;
        SessionFrequencyChange = sessionFrequencyChange;
        InpatientAdmission = inpatientAdmission;
    }

    /// <summary>The follow-up deadline: <paramref name="responseHours"/> after the flag was raised (the "72-hour" window).</summary>
    public DateTimeOffset DeadlineAt(int responseHours) => RaisedAt.AddHours(responseHours);

    /// <summary>Null while the episode is open; otherwise whether it closed before the deadline.</summary>
    public bool? ResolvedWithinWindow(int responseHours) => ResolvedAt is null ? null : ResolvedAt <= DeadlineAt(responseHours);
}
