using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.Guests.Commands;

/// <summary>One action the worker captured on the initial conversation form (spec §4.2 actions tracker).</summary>
public sealed record InitialConversationActionInput(string Description, DateOnly DueDate, Guid? AssignedToStaffId);

/// <summary>
/// Records the initial conversation, which is the gate that turns a New guest Active (§4.1).
/// The spec makes several things mandatory here, and this command is where they're enforced:
/// pathway classification, a named CMHW for the pathways that require one, the Immediate Risk
/// answer, and a next contact date for those same pathways.
/// </summary>
public sealed record RecordInitialConversationCommand(
    Guid GuestId,
    string? PresentingIssues,
    string? Notes,
    bool ConsentConfirmed,
    bool ImmediateRisk,
    GuestPathway Pathway,
    bool AfaSupportNeeded,
    Guid? AssignedCmhwId,
    DateOnly? NextContactDate,
    IReadOnlyList<InitialConversationActionInput>? Actions = null) : IRequest<Guid>;

public sealed class RecordInitialConversationCommandValidator : AbstractValidator<RecordInitialConversationCommand>
{
    public RecordInitialConversationCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.ConsentConfirmed).Equal(true).WithMessage("Consent must be confirmed.");
        RuleFor(x => x.Pathway).IsInEnum().WithMessage("A pathway classification is required.");

        // §4.4 — one-to-one pathways can't run without a named worker.
        RuleFor(x => x.AssignedCmhwId).NotNull()
            .When(x => GuestPathwayRules.RequiresNamedCmhw(x.Pathway))
            .WithMessage("A named CMHW is required for the Wellbeing Support and Additional / Clinical Support pathways.");

        // §4.2 — next contact is mandatory for the pathways with ongoing contact.
        RuleFor(x => x.NextContactDate).NotNull()
            .When(x => GuestPathwayRules.RequiresNextContactDate(x.Pathway))
            .WithMessage("A next contact date is required for this pathway.");

        RuleForEach(x => x.Actions).ChildRules(action =>
            action.RuleFor(a => a.Description).NotEmpty().MaximumLength(500));
    }
}

public sealed class RecordInitialConversationCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecordInitialConversationCommand, Guid>
{
    public async Task<Guid> Handle(RecordInitialConversationCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var record = new InitialConversationRecord(
            request.GuestId, currentUser.StaffId, request.PresentingIssues, request.Notes,
            request.ConsentConfirmed, request.ImmediateRisk, request.NextContactDate);

        db.InitialConversationRecords.Add(record);

        var previousPathway = guest.Pathway;
        var previousCmhw = guest.AssignedCmhwId;

        guest.Allocate(request.Pathway, request.AfaSupportNeeded);
        if (request.AssignedCmhwId is not null) guest.Reassign(request.AssignedCmhwId);
        guest.ActivateAfterInitialConversation(DateTimeOffset.UtcNow);

        // Pathway classification must be timestamped and stored historically (§4.3).
        if (previousPathway != request.Pathway)
        {
            db.PathwayChanges.Add(new PathwayChange(
                guest.Id, previousPathway, request.Pathway,
                previousPathway is null ? "Classified at initial conversation." : "Reclassified at initial conversation.",
                currentUser.StaffId, null, DateOnly.FromDateTime(DateTime.UtcNow), currentUser.StaffId));
        }

        // Allocation must be logged (§4.4).
        if (request.AssignedCmhwId is not null && previousCmhw != request.AssignedCmhwId)
        {
            db.CaseloadAssignments.Add(new CaseloadAssignment(
                guest.Id, previousCmhw, request.AssignedCmhwId, "Allocated at initial conversation.", currentUser.StaffId));
        }

        // Immediate Risk = Yes raises the urgent flag automatically (§4.5). The risk assessment
        // it writes is what the escalation worker consumes to build the urgent queue.
        if (request.ImmediateRisk)
        {
            var nextVersion = await db.RiskAssessments
                .Where(r => r.GuestId == request.GuestId)
                .Select(r => (int?)r.Version)
                .OrderByDescending(v => v)
                .FirstOrDefaultAsync(cancellationToken) ?? 0;

            db.RiskAssessments.Add(new RiskAssessment(
                request.GuestId, nextVersion + 1, currentUser.StaffId,
                suicidalIdeation: false, selfHarm: false, riskToOthers: false,
                severeDeterioration: true, safeguardingConcern: false,
                notes: "Immediate risk flagged at initial conversation."));

            guest.Escalate();

            var hasOpenEpisode = await db.UrgentEpisodes
                .AnyAsync(e => e.GuestId == request.GuestId && e.ResolvedAt == null, cancellationToken);
            if (!hasOpenEpisode) db.UrgentEpisodes.Add(new UrgentEpisode(request.GuestId, DateTimeOffset.UtcNow));
        }

        if (request.NextContactDate is not null)
        {
            db.FollowUps.Add(new FollowUp(
                request.GuestId, request.NextContactDate.Value,
                request.AssignedCmhwId ?? currentUser.StaffId,
                "Next contact agreed at initial conversation."));
        }

        foreach (var action in request.Actions ?? [])
        {
            db.GuestActions.Add(new GuestAction(
                request.GuestId, action.Description, action.DueDate, action.AssignedToStaffId ?? request.AssignedCmhwId ?? currentUser.StaffId));
        }

        await db.SaveChangesAsync(cancellationToken);
        return record.Id;
    }
}

/// <summary>
/// Pathway-driven rules from the spec, in one place so the register flow, the initial
/// conversation and later pathway changes all enforce the same thing.
/// </summary>
public static class GuestPathwayRules
{
    /// <summary>§4.4 — Wellbeing Support and Additional / Clinical Support need a named CMHW.</summary>
    public static bool RequiresNamedCmhw(GuestPathway pathway) =>
        pathway is GuestPathway.MentalWellbeing or GuestPathway.ClinicalSupport;

    /// <summary>§4.2 — the same one-to-one pathways need a next contact date.</summary>
    public static bool RequiresNextContactDate(GuestPathway pathway) => RequiresNamedCmhw(pathway);
}
