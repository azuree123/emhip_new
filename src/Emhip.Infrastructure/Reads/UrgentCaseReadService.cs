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
                u.GuestId, u.GuestName, u.SuicidalIdeation, u.SelfHarm, u.RiskToOthers, u.SevereDeterioration,
                u.SafeguardingConcern, u.AssignedCmhwName, u.EscalatedAt))
            .ToListAsync(cancellationToken);
}
