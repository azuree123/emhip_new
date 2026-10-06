namespace Emhip.Application.Guests;

/// <summary>
/// Named guest-list filters behind the dashboard and report counts (GET /guests?segment=…). Each
/// key is the drill-through for one tile or row — clicking a count opens exactly the guests it
/// counts. The client mirrors these keys and their labels in core/guest-segments.ts.
/// </summary>
public static class GuestSegments
{
    // Clinical complexity indicators (guest clinical profile).
    public const string Smi = "smi";
    public const string OnMedication = "onMedication";
    public const string TrustInvolvement = "trustInvolvement";
    public const string CpnInvolved = "cpnInvolved";

    // CPN involvement card.
    public const string CpnAssessment = "cpnAssessment";
    public const string CpnSessions30 = "cpnSessions30";
    public const string CpnReferrals30 = "cpnReferrals30";
    public const string CpnAny = "cpnAny";

    // Data quality checks (dashboard card + Data Quality report) — keys match DataQualityIssue keys.
    public const string MissingPathway = "missingPathway";
    public const string MissingInitialConversation = "missingInitialConversation";
    public const string MissingDialogBaseline = "missingDialogBaseline";
    public const string MissingDemographics = "missingDemographics";
    public const string MissingCmhw = "missingCmhw";
    public const string MissingReferralSource = "missingReferralSource";
    public const string NoRecentContact = "noRecentContact";
    public const string AutoInactive = "autoOnHold";
    public const string PastRetention = "pastRetention";

    // Reports screen KPIs. "…InPeriod" segments are measured over the reporting period passed as
    // periodFrom / periodTo (GET /guests); without one they cover all time.
    public const string AfaSupport = "afaSupport";
    public const string ContactInPeriod = "contactInPeriod";
    public const string DialogBaselineInPeriod = "dialogBaselineInPeriod";
    public const string DialogReassessedInPeriod = "dialogReassessedInPeriod";
    public const string DialogAwaitingReassessment = "dialogAwaitingReassessment";
    public const string CpnSeenInPeriod = "cpnSeenInPeriod";
    public const string CpnCaseload = "cpnCaseload";
    public const string CpnReferredInPeriod = "cpnReferredInPeriod";
    public const string CpnConfirmedInPeriod = "cpnConfirmedInPeriod";
    public const string CpnDeclinedInPeriod = "cpnDeclinedInPeriod";
    public const string CpnPendingInPeriod = "cpnPendingInPeriod";
}
