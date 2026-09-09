using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.UrgentCases;

public sealed record UrgentEpisodeDto(
    Guid Id,
    Guid GuestId,
    string GuestName,
    int GuestNumber,
    DateTimeOffset RaisedAt,
    DateTimeOffset? EscalatedToCmhtAt,
    string? EscalatedToCmhtByName,
    string? CmhtTeam,
    string? EscalationReason,
    string? EscalationUrgency,
    string? EscalationNotes,
    DateTimeOffset? ResolvedAt,
    string? ResolvedByName,
    string? ResolutionNote);

/// <summary>The guest's currently open urgent episode (null when none, or the guest doesn't exist).</summary>
public sealed record GetOpenUrgentEpisodeQuery(Guid GuestId) : IRequest<UrgentEpisodeDto?>;

/// <summary>Resolved episodes for the hub, newest first — backs the "Urgent Episode Record" history.</summary>
public sealed record GetResolvedUrgentEpisodesQuery(Guid HubId) : IRequest<IReadOnlyList<UrgentEpisodeDto>>;

public sealed class GetOpenUrgentEpisodeQueryHandler(IUrgentCaseReadService reads) : IRequestHandler<GetOpenUrgentEpisodeQuery, UrgentEpisodeDto?>
{
    public Task<UrgentEpisodeDto?> Handle(GetOpenUrgentEpisodeQuery request, CancellationToken cancellationToken) =>
        reads.GetOpenEpisodeAsync(request.GuestId, cancellationToken);
}

public sealed class GetResolvedUrgentEpisodesQueryHandler(IUrgentCaseReadService reads) : IRequestHandler<GetResolvedUrgentEpisodesQuery, IReadOnlyList<UrgentEpisodeDto>>
{
    public Task<IReadOnlyList<UrgentEpisodeDto>> Handle(GetResolvedUrgentEpisodesQuery request, CancellationToken cancellationToken) =>
        reads.GetResolvedEpisodesAsync(request.HubId, cancellationToken);
}

/// <summary>Escalate the guest's open urgent episode to a CMHT (opens an episode if the flag pre-dates episode tracking).</summary>
public sealed record EscalateToCmhtCommand(Guid GuestId, string CmhtTeam, string? Reason, string? Urgency, string? Notes) : IRequest;

public sealed class EscalateToCmhtCommandValidator : AbstractValidator<EscalateToCmhtCommand>
{
    public EscalateToCmhtCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.CmhtTeam).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Reason).MaximumLength(2000);
        RuleFor(x => x.Urgency).MaximumLength(50);
        RuleFor(x => x.Notes).MaximumLength(4000);
    }
}

public sealed class EscalateToCmhtCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<EscalateToCmhtCommand>
{
    public async Task Handle(EscalateToCmhtCommand request, CancellationToken cancellationToken)
    {
        var episode = await GetOrOpenEpisodeAsync(db, request.GuestId, currentUser.StaffId, cancellationToken);
        episode.EscalateToCmht(currentUser.StaffId, request.CmhtTeam, request.Reason, request.Urgency, request.Notes);
        await db.SaveChangesAsync(cancellationToken);
    }

    internal static async Task<UrgentEpisode> GetOrOpenEpisodeAsync(IAppDbContext db, Guid guestId, Guid staffId, CancellationToken cancellationToken)
    {
        var episode = await db.UrgentEpisodes
            .Where(e => e.GuestId == guestId && e.ResolvedAt == null)
            .OrderByDescending(e => e.RaisedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (episode is not null) return episode;

        var guest = await db.Guests.AsNoTracking()
            .Where(g => g.Id == guestId)
            .Select(g => new { g.Pathway, g.AssignedCmhwId, g.UrgentSince })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {guestId} not found.");

        // Urgent flags raised before episode tracking existed have no episode row — open one now,
        // dated from the flag itself so the 72-hour window is still measured from the right moment.
        var intake = await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guestId && (r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern))
            .OrderByDescending(r => r.AssessedAt)
            .Select(r => new { r.Id, r.AssessedByStaffId })
            .FirstOrDefaultAsync(cancellationToken);

        episode = new UrgentEpisode(
            guestId, guest.UrgentSince ?? DateTimeOffset.UtcNow,
            intake?.AssessedByStaffId ?? staffId, intake?.Id, guest.Pathway, guest.AssignedCmhwId);
        db.UrgentEpisodes.Add(episode);
        return episode;
    }
}

/// <summary>
/// Resolve the guest's urgent episode: closes and locks it, returns the guest to their pre-crisis
/// engagement status, and records the "Pathway re-entry decision" (design: Urgent Episode Record).
/// A pathway change here is applied to the guest and appended to the pathway history; a next
/// contact date is scheduled as a follow-up for the guest's CMHW.
/// </summary>
public sealed record ResolveUrgentCaseCommand(
    Guid GuestId,
    string? ResolutionNote,
    GuestPathway? PathwayAfterResolution = null,
    DateOnly? NextContactDate = null,
    string? SessionFrequencyChange = null,
    bool InpatientAdmission = false) : IRequest;

public sealed class ResolveUrgentCaseCommandValidator : AbstractValidator<ResolveUrgentCaseCommand>
{
    public ResolveUrgentCaseCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.ResolutionNote).MaximumLength(4000);
        RuleFor(x => x.SessionFrequencyChange).MaximumLength(200);
        RuleFor(x => x.NextContactDate)
            .GreaterThanOrEqualTo(_ => DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1))
            .When(x => x.NextContactDate is not null)
            .WithMessage("The next contact date cannot be in the past.");
    }
}

public sealed class ResolveUrgentCaseCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<ResolveUrgentCaseCommand>
{
    public async Task Handle(ResolveUrgentCaseCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var episode = await EscalateToCmhtCommandHandler.GetOrOpenEpisodeAsync(db, request.GuestId, currentUser.StaffId, cancellationToken);

        if (request.PathwayAfterResolution is { } newPathway && guest.Pathway != newPathway)
        {
            var previous = guest.Pathway;
            guest.Allocate(newPathway, guest.AfaSupportNeeded);
            db.PathwayChanges.Add(new PathwayChange(
                guest.Id, previous, newPathway, "Pathway re-entry decision on resolving the urgent episode",
                currentUser.StaffId, null, DateOnly.FromDateTime(DateTime.UtcNow), currentUser.StaffId));
        }

        episode.Resolve(
            currentUser.StaffId, request.ResolutionNote,
            request.PathwayAfterResolution ?? guest.Pathway, guest.AssignedCmhwId,
            request.NextContactDate, request.SessionFrequencyChange, request.InpatientAdmission);

        if (request.NextContactDate is { } due)
        {
            db.FollowUps.Add(new FollowUp(guest.Id, due, guest.AssignedCmhwId ?? currentUser.StaffId, "Next contact agreed on resolving the urgent episode."));
        }

        guest.ResolveUrgent();

        await db.SaveChangesAsync(cancellationToken);
    }
}
