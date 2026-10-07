using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// One urgent case for a guest (shown to staff as "Urgent Case 1, 2, …"): opened when risk flags
/// escalate the guest, and closed by an explicit resolution. EMHIP has no system link to the CMHT,
/// so staff record any call to the CMHT (or another NHS team) by hand on the case. The active
/// urgent-cases list stays on UrgentCases_ReadModel; this is the durable write-side record behind
/// the "Urgent Case Record" screen and the resolved-cases history.
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

    // ---- "CMHT or other NHS team notified" (recorded by hand — there is no CMHT integration) ----
    /// <summary>Null until someone answers the question; false is an explicit "No".</summary>
    public bool? CmhtNotified { get; private set; }
    /// <summary>The team or service called, e.g. "Crisis Resolution Team".</summary>
    public string? CmhtTeam { get; private set; }
    /// <summary>Name of the person spoken to.</summary>
    public string? CmhtContactName { get; private set; }
    /// <summary>When the call took place, as entered by the staff member.</summary>
    public DateTimeOffset? CmhtCalledAt { get; private set; }
    /// <summary>What was said.</summary>
    public string? CmhtCallNotes { get; private set; }
    /// <summary>
    /// "Called by" — the logged-in staff member who first recorded the answer. Kept when someone
    /// later corrects a "Yes" (the audit log has every edit); a change of answer re-stamps it.
    /// </summary>
    public Guid? CmhtRecordedByStaffId { get; private set; }
    public DateTimeOffset? CmhtRecordedAt { get; private set; }

    public DateTimeOffset? ResolvedAt { get; private set; }
    public Guid? ResolvedByStaffId { get; private set; }
    /// <summary>No longer asked for on resolution; kept for cases resolved before the Oct 2026 record spec.</summary>
    public string? ResolutionNote { get; private set; }
    /// <summary>"Any other external service involved" (e.g. ambulance, A&amp;E, police), captured at resolution.</summary>
    public string? ExternalServicesInvolved { get; private set; }

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

    /// <summary>
    /// Records whether the CMHT (or another NHS team) was contacted. Can be corrected while the
    /// case is open; "No" clears any call details previously entered. Correcting the details of a
    /// "Yes" keeps who made the call and when it was first recorded.
    /// </summary>
    public void RecordCmhtContact(Guid staffId, bool notified, string? team, string? contactName, DateTimeOffset? calledAt, string? notes)
    {
        if (IsResolved) throw new InvalidOperationException("This urgent case is resolved and locked.");
        if (notified && (string.IsNullOrWhiteSpace(contactName) || calledAt is null))
            throw new InvalidOperationException("The name of the person called and the date and time of the call are required.");

        var answerChanged = CmhtNotified != notified;
        CmhtNotified = notified;
        CmhtTeam = notified ? Blank(team) : null;
        CmhtContactName = notified ? Blank(contactName) : null;
        CmhtCalledAt = notified ? calledAt : null;
        CmhtCallNotes = notified ? Blank(notes) : null;
        if (answerChanged || CmhtRecordedByStaffId is null)
        {
            CmhtRecordedByStaffId = staffId;
            CmhtRecordedAt = DateTimeOffset.UtcNow;
        }
    }

    /// <summary>
    /// Makes <paramref name="riskAssessmentId"/> the assessment the record shows under "Flag details"
    /// (risks and urgent case notes). Used when registration's full risk step follows the initial
    /// conversation's automatic one moments later.
    /// </summary>
    public void UseOpeningAssessment(Guid riskAssessmentId)
    {
        if (IsResolved) throw new InvalidOperationException("This urgent case is resolved and locked.");
        RiskAssessmentId = riskAssessmentId;
    }

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public void Resolve(Guid staffId, string? note) => Resolve(staffId, note, null, null, null, null, false);

    /// <summary>
    /// Closes the case and records the resolution. A resolved case is locked:
    /// resolving twice throws so the audit trail never shows a second "resolved" entry.
    /// </summary>
    public void Resolve(
        Guid staffId, string? note, GuestPathway? pathwayAfterResolution, Guid? cmhwAfterResolutionStaffId,
        DateOnly? nextContactDate, string? sessionFrequencyChange, bool inpatientAdmission, string? externalServicesInvolved = null)
    {
        if (IsResolved) throw new InvalidOperationException("This urgent case is already resolved.");
        ResolvedAt = DateTimeOffset.UtcNow;
        ResolvedByStaffId = staffId;
        ResolutionNote = Blank(note);
        ExternalServicesInvolved = Blank(externalServicesInvolved);
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
