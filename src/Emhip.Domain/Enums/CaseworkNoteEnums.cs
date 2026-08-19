namespace Emhip.Domain.Enums;

/// <summary>"Mark as" on the casework note form — what kind of engagement this was.</summary>
public enum CaseworkNoteCategory
{
    Casework = 0,
    Activity = 1,
    Hospitality = 2,
    /// <summary>Advice First Aid.</summary>
    Afa = 3,
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
