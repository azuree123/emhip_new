using Emhip.Application.UrgentCases;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>Reads directly from the UrgentCases_ReadModel table maintained by EscalationWorker — no joins at request time.</summary>
public sealed class UrgentCaseReadService(EmhipDbContext db) : IUrgentCaseReadService
{
    public async Task<IReadOnlyList<UrgentCaseDto>> GetActiveUrgentCasesAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await db.UrgentCases.AsNoTracking()
            .Where(u => u.HubId == hubId && u.IsActive)
            .OrderByDescending(u => u.EscalatedAt)
            .Select(u => new UrgentCaseDto(
                u.GuestId, u.GuestName,
                db.Guests.Where(g => g.Id == u.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
                u.SuicidalIdeation, u.SelfHarm, u.RiskToOthers, u.SevereDeterioration,
                u.SafeguardingConcern, u.AssignedCmhwName, u.EscalatedAt))
            .ToListAsync(cancellationToken);

    public async Task<UrgentEpisodeDto?> GetOpenEpisodeAsync(Guid guestId, CancellationToken cancellationToken = default) =>
        await db.UrgentEpisodes.AsNoTracking()
            .Where(e => e.GuestId == guestId && e.ResolvedAt == null)
            .OrderByDescending(e => e.RaisedAt)
            .Select(e => new UrgentEpisodeDto(
                e.Id, e.GuestId,
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault() ?? "Unknown",
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
                e.RaisedAt,
                e.EscalatedToCmhtAt,
                db.Users.Where(u => u.Id == e.EscalatedToCmhtByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.CmhtTeam, e.EscalationReason, e.EscalationUrgency, e.EscalationNotes,
                e.ResolvedAt,
                db.Users.Where(u => u.Id == e.ResolvedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.ResolutionNote))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<UrgentEpisodeDto>> GetResolvedEpisodesAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await db.UrgentEpisodes.AsNoTracking()
            .Where(e => e.ResolvedAt != null && db.Guests.Any(g => g.Id == e.GuestId && g.HubId == hubId))
            .OrderByDescending(e => e.ResolvedAt)
            .Take(100)
            .Select(e => new UrgentEpisodeDto(
                e.Id, e.GuestId,
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault() ?? "Unknown",
                db.Guests.Where(g => g.Id == e.GuestId).Select(g => g.GuestNumber).FirstOrDefault(),
                e.RaisedAt,
                e.EscalatedToCmhtAt,
                db.Users.Where(u => u.Id == e.EscalatedToCmhtByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.CmhtTeam, e.EscalationReason, e.EscalationUrgency, e.EscalationNotes,
                e.ResolvedAt,
                db.Users.Where(u => u.Id == e.ResolvedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                e.ResolutionNote))
            .ToListAsync(cancellationToken);
}
