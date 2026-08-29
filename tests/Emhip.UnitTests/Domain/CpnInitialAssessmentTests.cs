using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using Xunit;

namespace Emhip.UnitTests.Domain;

public class CpnInitialAssessmentTests
{
    private static CpnInitialAssessment NewAssessment() =>
        new(Guid.NewGuid(), Guid.NewGuid(), ContactType.InPerson, DateTimeOffset.UtcNow);

    /// <summary>Every field the design marks with an asterisk, so Submit has nothing to object to.</summary>
    private static CpnInitialAssessmentFields CompleteFields(string? formulation = "Depressive episode in the context of housing insecurity.") =>
        new(
            ContactType.InPerson, DateTimeOffset.UtcNow,
            MethodOfAssessment: "face-to-face",
            OthersPresent: "guest-alone",
            ReasonForReferral: "CMHW flagged low mood and disengagement after the MDT.",
            ReferredBy: "cmhw-following-mdt",
            CurrentDiagnosis: "none-known",
            DiagnosisDetail: null,
            CurrentMedication: null,
            PreviousPresentations: null,
            PreviousInpatientAdmission: YesNoUnknown.No,
            PreviousMhaSection: YesNoUnknown.No,
            TalkingTherapies: null,
            PersonalHistory: null,
            FamilyMentalIllness: null,
            AppearanceAndBehaviour: "Dressed appropriately, engaged throughout.",
            Speech: "Normal rate and volume.",
            MoodSubjective: "\"Flat, most days.\"",
            MoodObjective: "Low but reactive.",
            Affect: "Congruent.",
            ThoughtsFormAndContent: "Linear; ruminating on housing.",
            Perceptions: "No hallucinations reported or observed.",
            Cognition: null,
            Insight: null,
            EnergyAndSleep: null,
            Appetite: null,
            SocialIsolation: null,
            SubstanceUse: null,
            SocialCircumstances: null,
            CapacityToConsent: CapacityToConsent.HasCapacity,
            CapacityNotes: null,
            OverallRiskRating: RiskRating.Low,
            ClinicalFormulation: formulation,
            RecommendedPlan: "Weekly CPN contact; medication review with the GP.",
            SafetyPlan: null,
            FollowUpFrequency: "weekly",
            NextAppointmentDate: new DateOnly(2026, 9, 5));

    [Fact]
    public void A_new_assessment_starts_as_an_unsubmitted_draft()
    {
        var assessment = NewAssessment();

        Assert.Equal(CpnAssessmentStatus.Draft, assessment.Status);
        Assert.False(assessment.IsSubmitted);
        Assert.Null(assessment.SubmittedAt);
    }

    [Fact]
    public void Submitting_without_a_clinical_formulation_is_refused()
    {
        var assessment = NewAssessment();
        assessment.Update(CompleteFields(formulation: "   "));

        var error = Assert.Throws<InvalidOperationException>(assessment.Submit);

        Assert.Contains("clinical formulation", error.Message);
        Assert.Equal(CpnAssessmentStatus.Draft, assessment.Status);
    }

    [Fact]
    public void Submitting_a_complete_assessment_stamps_it()
    {
        var assessment = NewAssessment();
        assessment.Update(CompleteFields());

        assessment.Submit();

        Assert.True(assessment.IsSubmitted);
        Assert.NotNull(assessment.SubmittedAt);
    }

    [Fact]
    public void A_submitted_assessment_cannot_be_edited()
    {
        var assessment = NewAssessment();
        assessment.Update(CompleteFields());
        assessment.Submit();

        Assert.Throws<InvalidOperationException>(() => assessment.Update(CompleteFields()));
        Assert.Throws<InvalidOperationException>(() => assessment.SetRiskDomains([]));
    }

    [Fact]
    public void A_submitted_assessment_cannot_be_submitted_twice()
    {
        var assessment = NewAssessment();
        assessment.Update(CompleteFields());
        assessment.Submit();

        Assert.Throws<InvalidOperationException>(assessment.Submit);
    }

    [Fact]
    public void Setting_risk_domains_replaces_the_previous_set()
    {
        var assessment = NewAssessment();

        assessment.SetRiskDomains(
        [
            (CpnRiskDomain.SelfHarmShortTerm, RiskRating.High, "Disclosed ideation last week."),
            (CpnRiskDomain.SelfNeglect, RiskRating.Medium, null),
        ]);
        assessment.SetRiskDomains([(CpnRiskDomain.SelfNeglect, RiskRating.Low, null)]);

        var domain = Assert.Single(assessment.RiskDomains);
        Assert.Equal(CpnRiskDomain.SelfNeglect, domain.Domain);
        Assert.Equal(RiskRating.Low, domain.Rating);
    }
}
