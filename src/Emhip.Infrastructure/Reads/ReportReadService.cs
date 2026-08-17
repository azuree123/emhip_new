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

        // Header KPI tiles — current counts, reused from the materialized dashboard snapshot
        // (never a live GROUP BY over Guests).
        var snapshot = await db.DashboardSnapshots.AsNoTracking()
            .FirstOrDefaultAsync(s => s.HubId == hubId, cancellationToken);
        var statusCounts = new GuestStatusCountsDto(
            snapshot?.TotalGuestsAcrossHub ?? 0,
            snapshot?.TotalActiveGuests ?? 0,
            snapshot?.PendingConversationGuests ?? 0,
            snapshot?.InactiveGuests ?? 0,
            snapshot?.UrgentGuests ?? 0);

        var fromOffset = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var toOffset = new DateTimeOffset(to.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var monthlyRegistrations = (await db.Guests.AsNoTracking()
                .Where(g => g.HubId == hubId && g.RegisteredAt >= fromOffset && g.RegisteredAt <= toOffset)
                .GroupBy(g => new { g.RegisteredAt.Year, g.RegisteredAt.Month })
                .Select(g => new MonthlyCountDto(g.Key.Year, g.Key.Month, g.Count()))
                .ToListAsync(cancellationToken))
            .OrderBy(m => m.Year).ThenBy(m => m.Month)
            .ToList();

        var guestsSeen = await db.Contacts.AsNoTracking()
            .Where(c => c.OccurredAt >= fromOffset && c.OccurredAt <= toOffset
                && db.Guests.Any(g => g.Id == c.GuestId && g.HubId == hubId))
            .Select(c => c.GuestId)
            .Distinct()
            .CountAsync(cancellationToken);

        var contactsRecorded = await db.Contacts.AsNoTracking()
            .CountAsync(c => c.OccurredAt >= fromOffset && c.OccurredAt <= toOffset
                && db.Guests.Any(g => g.Id == c.GuestId && g.HubId == hubId), cancellationToken);

        var urgentFlagsRaised = await db.RiskAssessments.AsNoTracking()
            .CountAsync(r => r.AssessedAt >= fromOffset && r.AssessedAt <= toOffset
                && (r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern)
                && db.Guests.Any(g => g.Id == r.GuestId && g.HubId == hubId), cancellationToken);

        var followUpEntries = await db.FollowUps.AsNoTracking()
            .CountAsync(f => f.DueDate >= from && f.DueDate <= to
                && db.Guests.Any(g => g.Id == f.GuestId && g.HubId == hubId), cancellationToken);

        var activity = new ReportActivityDto(guestsSeen, urgentFlagsRaised, followUpEntries, contactsRecorded);

        var ethnicityCounts = await db.GuestDemographics.AsNoTracking()
            .Where(d => d.Ethnicity != null && db.Guests.Any(g => g.Id == d.GuestId && g.HubId == hubId))
            .GroupBy(d => d.Ethnicity!)
            .Select(g => new { Label = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .Take(8)
            .ToListAsync(cancellationToken);
        var ethnicityTotal = ethnicityCounts.Sum(e => e.Count);
        var ethnicityBreakdown = ethnicityCounts
            .Select(e => new BreakdownSliceDto(
                e.Label, e.Count, ethnicityTotal == 0 ? 0 : Math.Round(100.0 * e.Count / ethnicityTotal, 1)))
            .ToList();

        return new PathwayReportDto(
            from, to, categoryTotals, totalReferrals,
            statusCounts, monthlyRegistrations, activity, ethnicityBreakdown);
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
