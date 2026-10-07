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
        var nextVersion = await db.RiskAssessments
            .Where(r => r.GuestId == request.GuestId)
            .Select(r => (int?)r.Version)
            .OrderByDescending(v => v)
            .FirstOrDefaultAsync(cancellationToken) ?? 0;

        var assessment = new RiskAssessment(
            request.GuestId, nextVersion + 1, currentUser.StaffId,
            request.SuicidalIdeation, request.SelfHarm, request.RiskToOthers,
            request.SevereDeterioration, request.SafeguardingConcern, request.Notes?.Trim(),
            request.OtherRisk, request.OtherRiskDetails);

        db.RiskAssessments.Add(assessment);

        if (assessment.HasAnyFlag)
        {
            var guest = await db.Guests.FirstAsync(g => g.Id == request.GuestId, cancellationToken);
            guest.Escalate();

            // One open urgent case per guest — raising again adds to the same case and window.
            var openEpisode = await db.UrgentEpisodes
                .Where(e => e.GuestId == request.GuestId && e.ResolvedAt == null)
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
            }
            else
            {
                // Snapshot who raised it and where the guest was, so the episode record reads the
                // same way later even after the guest's live pathway/CMHW have moved on.
                db.UrgentEpisodes.Add(new UrgentEpisode(
                    request.GuestId, DateTimeOffset.UtcNow, currentUser.StaffId, assessment.Id,
                    guest.Pathway, guest.AssignedCmhwId));
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return assessment.Id;
    }
}
