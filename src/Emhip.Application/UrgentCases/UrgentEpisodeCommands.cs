using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
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
        var episode = await GetOrOpenEpisodeAsync(db, request.GuestId, cancellationToken);
        episode.EscalateToCmht(currentUser.StaffId, request.CmhtTeam, request.Reason, request.Urgency, request.Notes);
        await db.SaveChangesAsync(cancellationToken);
    }

    internal static async Task<UrgentEpisode> GetOrOpenEpisodeAsync(IAppDbContext db, Guid guestId, CancellationToken cancellationToken)
    {
        var episode = await db.UrgentEpisodes
            .Where(e => e.GuestId == guestId && e.ResolvedAt == null)
            .OrderByDescending(e => e.RaisedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (episode is not null) return episode;

        var guestExists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        if (!guestExists) throw new KeyNotFoundException($"Guest {guestId} not found.");

        // Urgent flags raised before episode tracking existed have no episode row — open one now.
        episode = new UrgentEpisode(guestId, DateTimeOffset.UtcNow);
        db.UrgentEpisodes.Add(episode);
        return episode;
    }
}

/// <summary>Resolve the guest's urgent episode: closes it and returns the guest to Active status.</summary>
public sealed record ResolveUrgentCaseCommand(Guid GuestId, string? ResolutionNote) : IRequest;

public sealed class ResolveUrgentCaseCommandValidator : AbstractValidator<ResolveUrgentCaseCommand>
{
    public ResolveUrgentCaseCommandValidator()
    {
        RuleFor(x => x.GuestId).NotEmpty();
        RuleFor(x => x.ResolutionNote).MaximumLength(4000);
    }
}

public sealed class ResolveUrgentCaseCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<ResolveUrgentCaseCommand>
{
    public async Task Handle(ResolveUrgentCaseCommand request, CancellationToken cancellationToken)
    {
        var guest = await db.Guests.FirstOrDefaultAsync(g => g.Id == request.GuestId, cancellationToken)
            ?? throw new KeyNotFoundException($"Guest {request.GuestId} not found.");

        var episode = await EscalateToCmhtCommandHandler.GetOrOpenEpisodeAsync(db, request.GuestId, cancellationToken);
        episode.Resolve(currentUser.StaffId, request.ResolutionNote);
        guest.ResolveUrgent();

        await db.SaveChangesAsync(cancellationToken);
    }
}
