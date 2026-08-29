namespace Emhip.Domain.Enums;

/// <summary>
/// Which of the two CPN forms a contact uses. The design's "CPN session type" card pair:
/// Part 1 is completed once at the first CPN contact, Part 2 at every follow-up.
/// </summary>
public enum CpnSessionType
{
    /// <summary>Part 1 — the full initial clinical assessment. At most one per guest.</summary>
    InitialAssessment = 0,

    /// <summary>Part 2 — an SBAR block written at each follow-up contact.</summary>
    FollowUpSession = 1,
}

public enum CpnAssessmentStatus
{
    Draft = 0,
    Submitted = 1,
}

/// <summary>
/// Rating for one risk domain in the Part 1 risk assessment, and for the overall risk rating.
/// The design only shows the "Not applicable" default and a "Low" overall; the four-point scale
/// is the standard one used elsewhere in the app (see <see cref="CaseworkRiskLevel"/>).
/// </summary>
public enum RiskRating
{
    NotApplicable = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

/// <summary>"Capacity to consent?" — the design shows "Yes - has capacity".</summary>
public enum CapacityToConsent
{
    HasCapacity = 0,
    LacksCapacity = 1,
    Uncertain = 2,
}

/// <summary>
/// The Part 1 yes/no history questions ("Previous inpatient admission?", "Previous MH section
/// under MHA?"). Unknown is kept distinct from No — "not known" is not the same clinical claim.
/// </summary>
public enum YesNoUnknown
{
    No = 0,
    Yes = 1,
    Unknown = 2,
}

/// <summary>
/// The nine risk domains rated in Part 1, in the order the design lists them. Stored as a code
/// on the child row rather than as columns so the set can grow without a schema change.
/// </summary>
public enum CpnRiskDomain
{
    SelfHarmShortTerm = 0,
    SelfHarmLongTerm = 1,
    SuicideShortTerm = 2,
    SuicideLongTerm = 3,
    HarmToOthers = 4,
    HarmFromOthers = 5,
    RiskToChildren = 6,
    RefusingServices = 7,
    SelfNeglect = 8,
}
