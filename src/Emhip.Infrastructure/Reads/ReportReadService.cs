using System.Runtime.CompilerServices;
using Emhip.Application.Reports;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Aggregate totals are read from the columnstore-backed PathwayReportAggregates_ReadModel
/// (maintained by ReportMaterializerWorker) — never a live GROUP BY over PathwayReferrals.
/// The row-level export streams the source table directly via IAsyncEnumerable so
/// GET /reports/export never buffers the full result set in memory.
/// </summary>
public sealed class ReportReadService(EmhipDbContext db) : IReportReadService
{
    public async Task<PathwayReportDto> GetPathwayReportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        var totals = await db.PathwayReportAggregates.AsNoTracking()
            .Where(p => p.HubId == hubId
                && (p.Year > from.Year || (p.Year == from.Year && p.Month >= from.Month))
                && (p.Year < to.Year || (p.Year == to.Year && p.Month <= to.Month)))
            .GroupBy(p => p.Category)
            .Select(g => new { Category = g.Key, Count = g.Sum(x => x.ReferralCount) })
            .ToListAsync(cancellationToken);

        var totalReferrals = totals.Sum(t => t.Count);

        var categoryTotals = totals
            .Select(t => new PathwayCategoryTotalDto(
                t.Category.ToString(), t.Count, totalReferrals == 0 ? 0 : Math.Round(100.0 * t.Count / totalReferrals, 1)))
            .OrderByDescending(t => t.Count)
            .ToList();

        return new PathwayReportDto(from, to, categoryTotals, totalReferrals);
    }

    public async IAsyncEnumerable<ReportExportRowDto> StreamExportAsync(
        Guid hubId, DateOnly from, DateOnly to, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var fromOffset = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var toOffset = new DateTimeOffset(to.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var query = db.PathwayReferrals.AsNoTracking()
            .Where(p => p.ReferredAt >= fromOffset && p.ReferredAt <= toOffset
                && db.Guests.Any(g => g.Id == p.GuestId && g.HubId == hubId))
            .OrderBy(p => p.ReferredAt)
            .Select(p => new ReportExportRowDto(
                p.GuestId,
                db.Guests.Where(g => g.Id == p.GuestId).Select(g => g.FirstName + " " + g.LastName).FirstOrDefault() ?? "Unknown",
                p.Category.ToString(), p.Status.ToString(), p.ReferredAt))
            .AsAsyncEnumerable();

        await foreach (var row in query.WithCancellation(cancellationToken))
        {
            yield return row;
        }
    }
}
