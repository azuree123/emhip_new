using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Cpn;

public sealed record CpnRiskDomainDto(CpnRiskDomain Domain, RiskRating Rating, string? Notes);

public sealed record CpnInitialAssessmentDto(
    Guid Id,
    Guid GuestId,
    CpnAssessmentStatus Status,
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
    IReadOnlyList<CpnRiskDomainDto> RiskDomains,
    string? ClinicalFormulation,
    string? RecommendedPlan,
    string? SafetyPlan,
    string? FollowUpFrequency,
    DateOnly? NextAppointmentDate,
    string AuthorName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? SubmittedAt);

/// <summary>
/// What the Part 1 screen needs to render: the guest's assessment if one exists, plus whether a
/// new one may be started. The design's rule — "A new entry cannot be created if Part 1 already
/// exists for this guest" — is answered here rather than inferred by the client.
/// </summary>
public sealed record GuestCpnAssessmentDto(CpnInitialAssessmentDto? Assessment, bool CanCreate);

public sealed record CpnAssessmentInput(
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
    IReadOnlyList<CpnRiskDomainDto> RiskDomains,
    string? ClinicalFormulation,
    string? RecommendedPlan,
    string? SafetyPlan,
    string? FollowUpFrequency,
    DateOnly? NextAppointmentDate);

public sealed record GetCpnAssessmentQuery(Guid GuestId) : IRequest<GuestCpnAssessmentDto>;

public sealed class GetCpnAssessmentQueryHandler(IGuestReadService reads) : IRequestHandler<GetCpnAssessmentQuery, GuestCpnAssessmentDto>
{
    public Task<GuestCpnAssessmentDto> Handle(GetCpnAssessmentQuery request, CancellationToken cancellationToken) =>
        reads.GetCpnAssessmentAsync(request.GuestId, cancellationToken);
}

public sealed record SaveCpnAssessmentCommand(Guid GuestId, CpnAssessmentInput Input, bool Submit) : IRequest<Guid>;

public sealed class SaveCpnAssessmentCommandValidator : AbstractValidator<SaveCpnAssessmentCommand>
{
    public SaveCpnAssessmentCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();

        // Drafts stay deliberately unvalidated beyond lengths — Part 1 is long and is expected to
        // be filled over more than one sitting. The mandatory fields are enforced on submit by the
        // aggregate, so the same rule holds however the assessment is saved.
        RuleFor(x => x.Input.ReasonForReferral).MaximumLength(4000);
        RuleFor(x => x.Input.DiagnosisDetail).MaximumLength(2000);
        RuleFor(x => x.Input.CurrentMedication).MaximumLength(4000);
        RuleFor(x => x.Input.PreviousPresentations).MaximumLength(4000);
        RuleFor(x => x.Input.TalkingTherapies).MaximumLength(4000);
        RuleFor(x => x.Input.PersonalHistory).MaximumLength(4000);
        RuleFor(x => x.Input.FamilyMentalIllness).MaximumLength(4000);
        RuleFor(x => x.Input.SubstanceUse).MaximumLength(4000);
        RuleFor(x => x.Input.SocialCircumstances).MaximumLength(4000);
        RuleFor(x => x.Input.CapacityNotes).MaximumLength(2000);
        RuleFor(x => x.Input.ClinicalFormulation).MaximumLength(4000);
        RuleFor(x => x.Input.RecommendedPlan).MaximumLength(4000);
        RuleFor(x => x.Input.SafetyPlan).MaximumLength(4000);
        RuleForEach(x => x.Input.RiskDomains).ChildRules(d => d.RuleFor(r => r.Notes).MaximumLength(2000));
    }
}

/// <summary>
/// Saves or submits Part 1. There is at most one assessment per guest: a draft is resumed rather
/// than duplicated, and once submitted the aggregate refuses further edits, so a second attempt
/// fails here rather than quietly creating a rival baseline.
/// </summary>
public sealed class SaveCpnAssessmentCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<SaveCpnAssessmentCommand, Guid>
{
    public async Task<Guid> Handle(SaveCpnAssessmentCommand request, CancellationToken cancellationToken)
    {
        var guestExists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == request.GuestId, cancellationToken);
        if (!guestExists) throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var input = request.Input;

        var assessment = await db.CpnInitialAssessments
            .FirstOrDefaultAsync(a => a.GuestId == request.GuestId, cancellationToken);

        if (assessment is null)
        {
            assessment = new CpnInitialAssessment(request.GuestId, currentUser.StaffId, input.ContactMethod, input.OccurredAt);
            db.CpnInitialAssessments.Add(assessment);
        }
        else if (assessment.IsSubmitted)
        {
            throw new InvalidOperationException(
                "This guest already has a submitted CPN initial assessment. Record a follow-up session instead.");
        }

        assessment.Update(new CpnInitialAssessmentFields(
            input.ContactMethod, input.OccurredAt,
            input.MethodOfAssessment, input.OthersPresent,
            input.ReasonForReferral, input.ReferredBy, input.CurrentDiagnosis, input.DiagnosisDetail, input.CurrentMedication,
            input.PreviousPresentations, input.PreviousInpatientAdmission, input.PreviousMhaSection, input.TalkingTherapies,
            input.PersonalHistory, input.FamilyMentalIllness,
            input.AppearanceAndBehaviour, input.Speech, input.MoodSubjective, input.MoodObjective, input.Affect,
            input.ThoughtsFormAndContent, input.Perceptions, input.Cognition, input.Insight,
            input.EnergyAndSleep, input.Appetite, input.SocialIsolation,
            input.SubstanceUse, input.SocialCircumstances,
            input.CapacityToConsent, input.CapacityNotes,
            input.OverallRiskRating,
            input.ClinicalFormulation, input.RecommendedPlan, input.SafetyPlan,
            input.FollowUpFrequency, input.NextAppointmentDate));

        await ReconcileRiskDomainsAsync(assessment.Id, input.RiskDomains, cancellationToken);

        if (request.Submit)
        {
            assessment.Submit();

            // Submitting Part 1 is a contact in its own right, so it shows in the activity log
            // and the contact history beside the follow-up sessions that come after it.
            db.Contacts.Add(new Contact(
                request.GuestId, input.ContactMethod, ContactOutcome.Successful, input.OccurredAt,
                currentUser.StaffId, BuildContactSummary(input)));

            if (input.NextAppointmentDate is not null)
            {
                db.FollowUps.Add(new FollowUp(
                    request.GuestId, input.NextAppointmentDate.Value, currentUser.StaffId,
                    $"Next CPN appointment agreed at the initial assessment of {input.OccurredAt:dd MMM yyyy}."));
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return assessment.Id;
    }

    /// <summary>
    /// Brings the stored ratings in line with the submitted set: a domain the worker cleared is
    /// removed, one they changed is updated in place, one they added is inserted. Handled through
    /// the DbSet rather than a navigation collection — a freshly constructed child already carries
    /// an Id, which EF reads as "already exists" and turns into an UPDATE that matches no row.
    /// </summary>
    private async Task ReconcileRiskDomainsAsync(
        Guid assessmentId, IReadOnlyList<CpnRiskDomainDto> submitted, CancellationToken cancellationToken)
    {
        var existing = await db.CpnRiskDomainRatings
            .Where(d => d.AssessmentId == assessmentId)
            .ToListAsync(cancellationToken);

        var keptDomains = submitted.Select(d => d.Domain).ToHashSet();
        db.CpnRiskDomainRatings.RemoveRange(existing.Where(d => !keptDomains.Contains(d.Domain)));

        foreach (var input in submitted)
        {
            var row = existing.FirstOrDefault(d => d.Domain == input.Domain);
            if (row is null)
            {
                db.CpnRiskDomainRatings.Add(new CpnRiskDomainRating(assessmentId, input.Domain, input.Rating, input.Notes));
            }
            else
            {
                row.Update(input.Rating, input.Notes);
            }
        }
    }

    private static string BuildContactSummary(CpnAssessmentInput input)
    {
        var parts = new List<string> { "CPN initial assessment (Part 1)" };
        if (!string.IsNullOrWhiteSpace(input.ClinicalFormulation)) parts.Add($"Formulation: {input.ClinicalFormulation}");
        if (!string.IsNullOrWhiteSpace(input.RecommendedPlan)) parts.Add($"Plan: {input.RecommendedPlan}");
        if (input.OverallRiskRating != RiskRating.NotApplicable) parts.Add($"Overall risk: {input.OverallRiskRating}");

        var summary = string.Join(" — ", parts);
        return summary.Length > 1900 ? summary[..1900] + "…" : summary;
    }
}
