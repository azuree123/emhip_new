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
    string? Notes) : IRequest<Guid>;

public sealed class RecordRiskAssessmentCommandValidator : AbstractValidator<RecordRiskAssessmentCommand>
{
    public RecordRiskAssessmentCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
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
            request.SevereDeterioration, request.SafeguardingConcern, request.Notes);

        db.RiskAssessments.Add(assessment);

        if (assessment.HasAnyFlag)
        {
            var guest = await db.Guests.FirstAsync(g => g.Id == request.GuestId, cancellationToken);
            guest.Escalate();

            // One open episode per guest — repeated flag raises update the same episode window.
            var hasOpenEpisode = await db.UrgentEpisodes
                .AnyAsync(e => e.GuestId == request.GuestId && e.ResolvedAt == null, cancellationToken);
            if (!hasOpenEpisode)
            {
                db.UrgentEpisodes.Add(new UrgentEpisode(request.GuestId, DateTimeOffset.UtcNow));
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return assessment.Id;
    }
}
