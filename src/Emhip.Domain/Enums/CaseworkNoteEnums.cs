namespace Emhip.Domain.Enums;

/// <summary>
/// "Mark as" on the casework note form — mandatory note classification per spec §4.6
/// (Casework, Activity, Meeting, Daily Log), plus the Hospitality and Advice First Aid
/// categories the design adds for the Community &amp; Recovery pathway and cross-cutting AFA.
/// </summary>
public enum CaseworkNoteCategory
{
    Casework = 0,
    Activity = 1,
    Hospitality = 2,
    /// <summary>Advice First Aid.</summary>
    Afa = 3,
    Meeting = 4,
    DailyLog = 5,
}

public enum CaseworkNoteStatus
{
    Draft = 0,
    Submitted = 1,
}

/// <summary>
/// The worker's risk read for this contact. Distinct from the formal risk assessment: this is a
/// per-note indicator, and only the risk assessment escalates a guest onto the urgent queue.
/// </summary>
public enum CaseworkRiskLevel
{
    NoRiskDetected = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}
