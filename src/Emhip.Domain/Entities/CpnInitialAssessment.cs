using Emhip.Domain.Common;
using Emhip.Domain.Enums;

namespace Emhip.Domain.Entities;

/// <summary>
/// Part 1 of the CPN record — the full initial clinical assessment, completed once at the first
/// CPN contact. The design states the rule plainly: "A new entry cannot be created if Part 1
/// already exists for this guest", so <see cref="CpnInitialAssessment"/> is a per-guest singleton
/// once submitted. A draft may still be resumed and edited; a submitted assessment is part of the
/// clinical record and is never rewritten, which is why <see cref="Update"/> refuses afterwards.
///
/// Every follow-up contact is a separate SBAR <see cref="CaseworkNote"/> (Part 2) that refers back
/// to this baseline.
///
/// Field naming follows the design's labels, with one deliberate correction: the design labels the
/// MSE speech field "Speed", but its own placeholder reads "Rate, volume, tone, coherence" — that
/// is the standard MSE speech domain, so the property is <see cref="Speech"/>.
/// </summary>
public class CpnInitialAssessment : AggregateRoot
{
    public Guid GuestId { get; private set; }
    public CpnAssessmentStatus Status { get; private set; }

    // --- Header (shared with the Add Contact popup's top section) ---
    public ContactType ContactMethod { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }

    // --- 1. Method of assessment ---
    /// <summary>Lookup code from the <c>CpnAssessmentMethod</c> category (e.g. face-to-face).</summary>
    public string? MethodOfAssessment { get; private set; }

    /// <summary>Lookup code from the <c>CpnOthersPresent</c> category (e.g. guest alone).</summary>
    public string? OthersPresent { get; private set; }

    // --- 2. Diagnosis and medication ---
    public string? ReasonForReferral { get; private set; }

    /// <summary>Lookup code from the <c>CpnReferralSource</c> category.</summary>
    public string? ReferredBy { get; private set; }

    /// <summary>Lookup code from the <c>CpnDiagnosisStatus</c> category.</summary>
    public string? CurrentDiagnosis { get; private set; }
    public string? DiagnosisDetail { get; private set; }
    public string? CurrentMedication { get; private set; }

    // --- 3. Past psychiatric history ---
    public string? PreviousPresentations { get; private set; }
    public YesNoUnknown PreviousInpatientAdmission { get; private set; }
    public YesNoUnknown PreviousMhaSection { get; private set; }
    public string? TalkingTherapies { get; private set; }

    // --- 4. Personal and family history ---
    public string? PersonalHistory { get; private set; }
    public string? FamilyMentalIllness { get; private set; }

    // --- 5. Mental state examination ---
    public string? AppearanceAndBehaviour { get; private set; }
    public string? Speech { get; private set; }
    public string? MoodSubjective { get; private set; }
    public string? MoodObjective { get; private set; }
    public string? Affect { get; private set; }
    public string? ThoughtsFormAndContent { get; private set; }
    public string? Perceptions { get; private set; }
    public string? Cognition { get; private set; }
    public string? Insight { get; private set; }
    public string? EnergyAndSleep { get; private set; }
    public string? Appetite { get; private set; }
    public string? SocialIsolation { get; private set; }

    // --- 6. Substance use ---
    public string? SubstanceUse { get; private set; }

    // --- 7. Social circumstances ---
    public string? SocialCircumstances { get; private set; }

    // --- 8. Mental capacity ---
    public CapacityToConsent CapacityToConsent { get; private set; }
    public string? CapacityNotes { get; private set; }

    // --- 9. Risk assessment ---
    // The nine per-domain ratings live in their own table and are reconciled by the command
    // handler through the DbSet, the way care plan goals are. Attaching freshly constructed
    // children to a tracked navigation does not work here: Entity assigns its own Id, so EF reads
    // the set key as "already exists" and issues an UPDATE that matches no row.
    public RiskRating OverallRiskRating { get; private set; }

    // --- 10. Clinical impression and plan ---
    public string? ClinicalFormulation { get; private set; }
    public string? RecommendedPlan { get; private set; }
    public string? SafetyPlan { get; private set; }

    /// <summary>Lookup code from the <c>CpnFollowUpFrequency</c> category (e.g. weekly).</summary>
    public string? FollowUpFrequency { get; private set; }
    public DateOnly? NextAppointmentDate { get; private set; }

    public Guid AuthorStaffId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public DateTimeOffset? SubmittedAt { get; private set; }

    private CpnInitialAssessment() { }

    public CpnInitialAssessment(Guid guestId, Guid authorStaffId, ContactType contactMethod, DateTimeOffset occurredAt)
    {
        GuestId = guestId;
        AuthorStaffId = authorStaffId;
        ContactMethod = contactMethod;
        OccurredAt = occurredAt;
        Status = CpnAssessmentStatus.Draft;
        CapacityToConsent = CapacityToConsent.HasCapacity;
        OverallRiskRating = RiskRating.NotApplicable;
        PreviousInpatientAdmission = YesNoUnknown.No;
        PreviousMhaSection = YesNoUnknown.No;
        CreatedAt = DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public bool IsSubmitted => Status == CpnAssessmentStatus.Submitted;

    public void Update(CpnInitialAssessmentFields fields)
    {
        if (IsSubmitted)
        {
            throw new InvalidOperationException("A submitted CPN initial assessment cannot be edited.");
        }

        ContactMethod = fields.ContactMethod;
        OccurredAt = fields.OccurredAt;

        MethodOfAssessment = fields.MethodOfAssessment;
        OthersPresent = fields.OthersPresent;

        ReasonForReferral = fields.ReasonForReferral;
        ReferredBy = fields.ReferredBy;
        CurrentDiagnosis = fields.CurrentDiagnosis;
        DiagnosisDetail = fields.DiagnosisDetail;
        CurrentMedication = fields.CurrentMedication;

        PreviousPresentations = fields.PreviousPresentations;
        PreviousInpatientAdmission = fields.PreviousInpatientAdmission;
        PreviousMhaSection = fields.PreviousMhaSection;
        TalkingTherapies = fields.TalkingTherapies;

        PersonalHistory = fields.PersonalHistory;
        FamilyMentalIllness = fields.FamilyMentalIllness;

        AppearanceAndBehaviour = fields.AppearanceAndBehaviour;
        Speech = fields.Speech;
        MoodSubjective = fields.MoodSubjective;
        MoodObjective = fields.MoodObjective;
        Affect = fields.Affect;
        ThoughtsFormAndContent = fields.ThoughtsFormAndContent;
        Perceptions = fields.Perceptions;
        Cognition = fields.Cognition;
        Insight = fields.Insight;
        EnergyAndSleep = fields.EnergyAndSleep;
        Appetite = fields.Appetite;
        SocialIsolation = fields.SocialIsolation;

        SubstanceUse = fields.SubstanceUse;
        SocialCircumstances = fields.SocialCircumstances;

        CapacityToConsent = fields.CapacityToConsent;
        CapacityNotes = fields.CapacityNotes;

        OverallRiskRating = fields.OverallRiskRating;

        ClinicalFormulation = fields.ClinicalFormulation;
        RecommendedPlan = fields.RecommendedPlan;
        SafetyPlan = fields.SafetyPlan;
        FollowUpFrequency = fields.FollowUpFrequency;
        NextAppointmentDate = fields.NextAppointmentDate;

        UpdatedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Finalises Part 1. The mandatory fields are the ones the design marks with an asterisk;
    /// beyond that a draft is deliberately free to be incomplete.
    /// </summary>
    public void Submit()
    {
        if (IsSubmitted)
        {
            throw new InvalidOperationException("This CPN initial assessment has already been submitted.");
        }

        Require(ReasonForReferral, "a reason for referral to the CPN");
        Require(ReferredBy, "who referred the guest");
        Require(MethodOfAssessment, "the method of assessment");
        Require(AppearanceAndBehaviour, "the appearance and behaviour observation");
        Require(Speech, "the speech observation");
        Require(MoodSubjective, "the guest's own description of mood");
        Require(MoodObjective, "the observed mood");
        Require(Affect, "the affect observation");
        Require(ThoughtsFormAndContent, "the thoughts observation");
        Require(Perceptions, "the perceptions observation");
        Require(ClinicalFormulation, "a clinical formulation");
        Require(RecommendedPlan, "a recommended clinical plan");
        Require(FollowUpFrequency, "a follow-up frequency");

        if (NextAppointmentDate is null)
        {
            throw new InvalidOperationException("A next appointment date is required to submit the CPN initial assessment.");
        }

        Status = CpnAssessmentStatus.Submitted;
        SubmittedAt = DateTimeOffset.UtcNow;
        UpdatedAt = SubmittedAt.Value;
    }

    private static void Require(string? value, string what)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"The CPN initial assessment needs {what} before it can be submitted.");
        }
    }
}

/// <summary>
/// The Part 1 field set, passed as one object so the aggregate's Update signature stays readable
/// — there are forty of them.
/// </summary>
public sealed record CpnInitialAssessmentFields(
    ContactType ContactMethod,
    DateTimeOffset OccurredAt,
    string? MethodOfAssessment,
    string? OthersPresent,
    string? ReasonForReferral,
    string? ReferredBy,
    string? CurrentDiagnosis,
    string? DiagnosisDetail,
    string? CurrentMedication,
    string? PreviousPresentations,
    YesNoUnknown PreviousInpatientAdmission,
    YesNoUnknown PreviousMhaSection,
    string? TalkingTherapies,
    string? PersonalHistory,
    string? FamilyMentalIllness,
    string? AppearanceAndBehaviour,
    string? Speech,
    string? MoodSubjective,
    string? MoodObjective,
    string? Affect,
    string? ThoughtsFormAndContent,
    string? Perceptions,
    string? Cognition,
    string? Insight,
    string? EnergyAndSleep,
    string? Appetite,
    string? SocialIsolation,
    string? SubstanceUse,
    string? SocialCircumstances,
    CapacityToConsent CapacityToConsent,
    string? CapacityNotes,
    RiskRating OverallRiskRating,
    string? ClinicalFormulation,
    string? RecommendedPlan,
    string? SafetyPlan,
    string? FollowUpFrequency,
    DateOnly? NextAppointmentDate);

/// <summary>One rated risk domain within Part 1's risk assessment section.</summary>
public class CpnRiskDomainRating : Entity
{
    public Guid AssessmentId { get; private set; }
    public CpnRiskDomain Domain { get; private set; }
    public RiskRating Rating { get; private set; }
    public string? Notes { get; private set; }

    private CpnRiskDomainRating() { }

    public CpnRiskDomainRating(Guid assessmentId, CpnRiskDomain domain, RiskRating rating, string? notes)
    {
        AssessmentId = assessmentId;
        Domain = domain;
        Rating = rating;
        Notes = notes;
    }

    public void Update(RiskRating rating, string? notes)
    {
        Rating = rating;
        Notes = notes;
    }
}
