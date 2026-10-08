using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Commands;

/// <summary>
/// Append-only risk (re)assessment. Raises RiskFlagRaisedEvent (via RiskAssessment's own
/// domain events, relayed through the outbox) whenever any flag is set — see
/// ARCHITECTURE.md "Escalation worker".
/// </summary>
public sealed record RecordRiskAssessmentCommand(
    Guid GuestId,
    bool SuicidalIdeation,
    bool SelfHarm,
    bool RiskToOthers,
    bool SevereDeterioration,
    bool SafeguardingConcern,
    string? Notes,
    bool OtherRisk = false,
    string? OtherRiskDetails = null) : IRequest<Guid>;

public sealed class RecordRiskAssessmentCommandValidator : AbstractValidator<RecordRiskAssessmentCommand>
{
    public RecordRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.Notes).MaximumLength(4000);
        // An urgent case with no notes is not acceptable (customer feedback, Oct 2026).
        RuleFor(x => x.Notes)
            .NotEmpty()
            .When(x => x.SuicidalIdeation || x.SelfHarm || x.RiskToOthers || x.SevereDeterioration || x.SafeguardingConcern || x.OtherRisk)
            .WithMessage("Urgent case notes are required.");
        RuleFor(x => x.OtherRiskDetails)
            .NotEmpty().When(x => x.OtherRisk).WithMessage("Describe the risk when 'Other' is selected.")
            .MaximumLength(500);
    }
}

public sealed class RecordRiskAssessmentCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecordRiskAssessmentCommand, Guid>
{
    public async Task<Guid> Handle(RecordRiskAssessmentCommand request, CancellationToken cancellationToken)
    {
        var (assessment, _) = await RiskAssessmentRecorder.RecordAsync(
            db, request.GuestId, currentUser.StaffId,
            request.SuicidalIdeation, request.SelfHarm, request.RiskToOthers,
            request.SevereDeterioration, request.SafeguardingConcern, request.Notes?.Trim(),
            request.OtherRisk, request.OtherRiskDetails, cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return assessment.Id;
    }
}

/// <summary>
/// Records a risk assessment and, when it carries a flag, escalates the guest: marks them urgent
/// and opens their urgent case, or adds to the one already open. Shared by the Raise Urgent Case
/// popup and a casework note's immediate risk, so both reach the Urgent Cases dashboard (and the
/// Hub Manager alert, via the assessment's domain event) the same way. The caller saves.
/// </summary>
public static class RiskAssessmentRecorder
{
    /// <returns>The new assessment, and the urgent case it opened or added to (null when it carries no flag).</returns>
    public static async Task<(RiskAssessment Assessment, UrgentEpisode? Episode)> RecordAsync(
        IAppDbContext db, Guid guestId, Guid staffId,
        bool suicidalIdeation, bool selfHarm, bool riskToOthers, bool severeDeterioration, bool safeguardingConcern,
        string? notes, bool otherRisk, string? otherRiskDetails, CancellationToken cancellationToken)
    {
        var nextVersion = await db.RiskAssessments
            .Where(r => r.GuestId == guestId)
            .Select(r => (int?)r.Version)
            .OrderByDescending(v => v)
            .FirstOrDefaultAsync(cancellationToken) ?? 0;

        var assessment = new RiskAssessment(
            guestId, nextVersion + 1, staffId,
            suicidalIdeation, selfHarm, riskToOthers, severeDeterioration, safeguardingConcern, notes,
            otherRisk, otherRiskDetails);

        db.RiskAssessments.Add(assessment);

        if (!assessment.HasAnyFlag) return (assessment, null);

        var guest = await db.Guests.FirstAsync(g => g.Id == guestId, cancellationToken);
        guest.Escalate();

        // One open urgent case per guest — raising again adds to the same case and window.
        var openEpisode = await db.UrgentEpisodes
            .Where(e => e.GuestId == guestId && e.ResolvedAt == null)
            .OrderByDescending(e => e.RaisedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (openEpisode is not null)
        {
            // Registration: the initial conversation's Immediate Risk = Yes opened the case a
            // moment ago with an automatic assessment; this one carries the worker's actual
            // risks and notes, so it becomes what the Urgent Case Record shows.
            var openedAutomatically = openEpisode.RiskAssessmentId is { } openingId
                && openEpisode.RaisedAt > DateTimeOffset.UtcNow.AddMinutes(-30)
                && await db.RiskAssessments.AnyAsync(
                    r => r.Id == openingId && r.Notes != null && r.Notes.StartsWith(RecordInitialConversationCommandHandler.ImmediateRiskNote),
                    cancellationToken);
            if (openedAutomatically) openEpisode.UseOpeningAssessment(assessment.Id);
            return (assessment, openEpisode);
        }

        // Snapshot who raised it and where the guest was, so the episode record reads the
        // same way later even after the guest's live pathway/CMHW have moved on.
        var episode = new UrgentEpisode(
            guestId, DateTimeOffset.UtcNow, staffId, assessment.Id,
            guest.Pathway, guest.AssignedCmhwId);
        db.UrgentEpisodes.Add(episode);
        return (assessment, episode);
    }
}
