using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using Emhip.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Application.UrgentCases;

/// <summary>An urgent case in the resolved list (and the guest's open case, if any).</summary>
public sealed record UrgentEpisodeDto(
    Guid Id,
    Guid GuestId,
    string GuestName,
    int GuestNumber,
    DateTimeOffset RaisedAt,
    bool? CmhtNotified,
    string? CmhtTeam,
    DateTimeOffset? ResolvedAt,
    string? ResolvedByName,
    string? ResolutionNote,
    string? ExternalServicesInvolved,
    bool InpatientAdmission);

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

/// <summary>
/// "CMHT or other NHS team notified" on the Urgent Case Record. EMHIP has no system link to the
/// CMHT, so this is the staff member's own record of the call: whether they made one, who they
/// spoke to, when, and what was said. "Called by" is always the logged-in user.
/// </summary>
public sealed record RecordCmhtContactCommand(
    Guid HubId, Guid EpisodeId, bool Notified, string? Team, string? ContactName, DateTimeOffset? CalledAt, string? Notes) : IRequest;

public sealed class RecordCmhtContactCommandValidator : AbstractValidator<RecordCmhtContactCommand>
{
    public RecordCmhtContactCommandValidator()
    {
        RuleFor(x => x.EpisodeId).NotEmpty();
        RuleFor(x => x.Team).MaximumLength(200);
        RuleFor(x => x.ContactName).MaximumLength(200);
        RuleFor(x => x.Notes).MaximumLength(4000);
        When(x => x.Notified, () =>
        {
            RuleFor(x => x.ContactName).NotEmpty().WithMessage("Enter the name of the person you spoke to.");
            RuleFor(x => x.CalledAt).NotNull().WithMessage("Enter the date and time of the call.");
            RuleFor(x => x.CalledAt)
                .LessThanOrEqualTo(_ => DateTimeOffset.UtcNow.AddMinutes(5))
                .When(x => x.CalledAt is not null)
                .WithMessage("The call cannot be in the future.");
        });
    }
}

public sealed class RecordCmhtContactCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<RecordCmhtContactCommand>
{
    public async Task Handle(RecordCmhtContactCommand request, CancellationToken cancellationToken)
    {
        var episode = await db.UrgentEpisodes
            .FirstOrDefaultAsync(e => e.Id == request.EpisodeId
                && db.Guests.Any(g => g.Id == e.GuestId && g.HubId == request.HubId), cancellationToken)
            ?? throw new KeyNotFoundException($"Urgent case {request.EpisodeId} not found.");

        episode.RecordCmhtContact(currentUser.StaffId, request.Notified, request.Team, request.ContactName, request.CalledAt, request.Notes);
        await db.SaveChangesAsync(cancellationToken);
    }
}

internal static class UrgentEpisodeLookup
{
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
            .Where(r => r.GuestId == guestId && (r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern || r.OtherRisk))
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
/// "Mark as resolved": closes and locks the guest's open urgent case and returns the guest to
/// their pre-crisis engagement status. Resolved by / at come from the login and the clock; the
/// Urgent Case Record spec (Oct 2026) asks for inpatient admission and any other external
/// service involved, and the action taken to resolve (<see cref="ResolutionNote"/>) is required. The older pathway re-entry fields stay optional for API callers: a pathway
/// change is applied to the guest and appended to the pathway history, and a next contact date is
/// scheduled for the guest's CMHW.
///
/// The Urgent Case Record resolves by <see cref="EpisodeId"/> (scoped to <see cref="HubId"/>), so a
/// record left open on a second screen gets "already resolved" instead of acting on another case.
/// Without an episode id the guest's open case is resolved; a case row is only opened for a guest
/// who is still urgent from before case tracking existed.
/// </summary>
public sealed record ResolveUrgentCaseCommand(
    Guid GuestId,
    string? ResolutionNote,
    GuestPathway? PathwayAfterResolution = null,
    DateOnly? NextContactDate = null,
    string? SessionFrequencyChange = null,
    bool InpatientAdmission = false,
    string? ExternalServicesInvolved = null,
    Guid? EpisodeId = null,
    Guid? HubId = null) : IRequest;

public sealed class ResolveUrgentCaseCommandValidator : AbstractValidator<ResolveUrgentCaseCommand>
{
    public ResolveUrgentCaseCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty().When(x => x.EpisodeId is null);
        // "Action taken to resolve" (customer feedback, Oct 2026): a case is never closed without
        // the record saying what was done about it.
        RuleFor(x => x.ResolutionNote)
            .NotEmpty().WithMessage("Record the action taken to resolve this urgent case.")
            .MaximumLength(4000);
        RuleFor(x => x.SessionFrequencyChange).MaximumLength(200);
        RuleFor(x => x.ExternalServicesInvolved).MaximumLength(500);
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
        UrgentEpisode episode;
        Guest guest;
        if (request.EpisodeId is { } episodeId)
        {
            var hubId = request.HubId ?? currentUser.HubId;
            episode = await db.UrgentEpisodes
                .FirstOrDefaultAsync(e => e.Id == episodeId && db.Guests.Any(g => g.Id == e.GuestId && g.HubId == hubId), cancellationToken)
                ?? throw new KeyNotFoundException($"Urgent case {episodeId} not found.");
            guest = await db.Guests.FirstAsync(g => g.Id == episode.GuestId, cancellationToken);
        }
        else
        {
            guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
                ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");
            var open = await db.UrgentEpisodes.AnyAsync(e => e.GuestId == guest.Id && e.ResolvedAt == null, cancellationToken);
            if (!open && !guest.IsUrgent)
                throw new InvalidOperationException("This guest has no open urgent case — it may already have been resolved.");
            episode = await UrgentEpisodeLookup.GetOrOpenEpisodeAsync(db, guest.Id, currentUser.StaffId, cancellationToken);
        }

        // Checked before anything else changes, so a second "Mark as resolved" leaves no trace.
        if (episode.IsResolved) throw new InvalidOperationException("This urgent case has already been resolved.");

        if (request.PathwayAfterResolution is { } newPathway && guest.Pathway != newPathway)
        {
            var previous = guest.Pathway;
            guest.Allocate(newPathway, guest.AfaSupportNeeded);
            db.PathwayChanges.Add(new PathwayChange(
                guest.Id, previous, newPathway, "Pathway re-entry decision on resolving the urgent case",
                currentUser.StaffId, null, DateOnly.FromDateTime(DateTime.UtcNow), currentUser.StaffId));
        }

        episode.Resolve(
            currentUser.StaffId, request.ResolutionNote,
            request.PathwayAfterResolution ?? guest.Pathway, guest.AssignedCmhwId,
            request.NextContactDate, request.SessionFrequencyChange, request.InpatientAdmission, request.ExternalServicesInvolved);

        if (request.NextContactDate is { } due)
        {
            db.FollowUps.Add(new FollowUp(guest.Id, due, guest.AssignedCmhwId ?? currentUser.StaffId, "Next contact agreed on resolving the urgent case."));
        }

        guest.ResolveUrgent();

        await db.SaveChangesAsync(cancellationToken);
    }
}
