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

/// <summary>
/// The "Risk assessment" on the New Casework Note — one answer per note (design: "You can select
/// only one option from risk assessment section"). The six criteria are immediate risks: submitting
/// a note with one alerts the Hub Manager by opening (or adding to) the guest's urgent case, and
/// starts the 72-hour follow-up window. "Note a concern" is recorded against the note without an
/// alert. Null on notes written through the Add Contact popup, which asks the YES/NO risk check instead.
/// </summary>
public enum CaseworkRiskCheck
{
    /// <summary>"None of the above apply — no immediate risk criteria met in this contact".</summary>
    NoneApply = 0,
    /// <summary>"Note a concern — does not trigger an immediate alert".</summary>
    NoteConcern = 1,
    SuicidalIdeationOrSelfHarm = 2,
    RiskOfHarmToOthers = 3,
    /// <summary>"Signs of psychosis — not under MH team".</summary>
    PsychosisNotUnderMhTeam = 4,
    ImmediateRiskOfHomelessness = 5,
    NoAccessToFood = 6,
    SafeguardingConcern = 7,
}
