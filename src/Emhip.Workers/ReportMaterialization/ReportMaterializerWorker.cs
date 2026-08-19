using System.Text.Json;
using Emhip.Application.Dashboards;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Emhip.Infrastructure.ReadModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Emhip.Workers.ReportMaterialization;

/// <summary>
/// Refreshes DashboardSnapshots_ReadModel and PathwayReportAggregates_ReadModel from source
/// tables. Runs on a short interval here for a responsive demo; ARCHITECTURE.md's target
/// cadence is "nightly + incremental refresh" once real volumes make a live sweep too slow.
/// </summary>
public sealed class ReportMaterializerWorker(IServiceScopeFactory scopeFactory, ILogger<ReportMaterializerWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RefreshAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Report materialization sweep failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }

    private async Task RefreshAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EmhipDbContext>();

        var hubIds = await db.Hubs.AsNoTracking().Select(h => h.Id).ToListAsync(cancellationToken);

        foreach (var hubId in hubIds)
        {
            await RefreshDashboardSnapshotAsync(db, hubId, cancellationToken);
            await RefreshPathwayAggregatesAsync(db, hubId, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task RefreshDashboardSnapshotAsync(EmhipDbContext db, Guid hubId, CancellationToken cancellationToken)
    {
        var statusCounts = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId)
            .GroupBy(g => g.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        int CountOf(GuestStatus status) => statusCounts.FirstOrDefault(s => s.Status == status)?.Count ?? 0;

        var pathwayDistribution = await db.PathwayReferrals.AsNoTracking()
            .Where(p => db.Guests.Any(g => g.Id == p.GuestId && g.HubId == hubId))
            .GroupBy(p => p.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var totalReferrals = pathwayDistribution.Sum(p => p.Count);
        var pathwayDtos = pathwayDistribution
            .Select(p => new PathwayDistributionDto(p.Category.ToString(), p.Count, totalReferrals == 0 ? 0 : Math.Round(100.0 * p.Count / totalReferrals, 1)))
            .ToList();

        var sixMonthsAgo = DateTimeOffset.UtcNow.AddMonths(-6);
        var monthlyStats = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && g.RegisteredAt >= sixMonthsAgo)
            .GroupBy(g => new { g.RegisteredAt.Year, g.RegisteredAt.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                NewGuests = g.Count(),
                ClosedGuests = g.Count(x => x.Status == GuestStatus.OnHold),
            })
            .ToListAsync(cancellationToken);

        var monthlyDtos = new List<MonthlyStatDto>();
        foreach (var m in monthlyStats)
        {
            var contactCount = await db.Contacts.AsNoTracking()
                .CountAsync(c => c.OccurredAt.Year == m.Year && c.OccurredAt.Month == m.Month && db.Guests.Any(g => g.Id == c.GuestId && g.HubId == hubId), cancellationToken);
            monthlyDtos.Add(new MonthlyStatDto(m.Year, m.Month, m.NewGuests, m.ClosedGuests, contactCount));
        }

        // Clinical complexity indicators per spec §5.1 — SMI, medication, Trust involvement and
        // CPN involvement, taken from the guests' clinical profiles. (Risk-assessment flags drive
        // the urgent queue instead; they are a safety signal, not a complexity measure.)
        var profiles = await db.GuestClinicalProfiles.AsNoTracking()
            .Where(p => db.Guests.Any(g => g.Id == p.GuestId && g.HubId == hubId && !g.IsDeleted))
            .Select(p => new { p.SmiIndicator, p.CurrentMedications, p.TrustInvolvement, p.CpnInvolved })
            .ToListAsync(cancellationToken);

        var clinicalComplexity = new List<ClinicalIndicatorDto>
        {
            new("SMI", profiles.Count(p => p.SmiIndicator)),
            new("On medication", profiles.Count(p => p.CurrentMedications != null && p.CurrentMedications != "")),
            new("Trust involvement", profiles.Count(p => p.TrustInvolvement)),
            new("CPN involvement", profiles.Count(p => p.CpnInvolved)),
        };

        var snapshot = await db.DashboardSnapshots.FirstOrDefaultAsync(s => s.HubId == hubId, cancellationToken);
        if (snapshot is null)
        {
            snapshot = new DashboardSnapshot { HubId = hubId };
            db.DashboardSnapshots.Add(snapshot);
        }

        snapshot.TotalActiveGuests = CountOf(GuestStatus.Active);
        snapshot.PendingConversationGuests = CountOf(GuestStatus.New);
        snapshot.InactiveGuests = CountOf(GuestStatus.OnHold);
        // Urgency is a flag now, not a status, so it is counted separately.
        snapshot.UrgentGuests = await db.Guests.AsNoTracking()
            .CountAsync(g => g.HubId == hubId && !g.IsDeleted && g.IsUrgent, cancellationToken);
        snapshot.TotalGuestsAcrossHub = statusCounts.Sum(s => s.Count);
        snapshot.PathwayDistributionJson = JsonSerializer.Serialize(pathwayDtos);
        snapshot.MonthlyStatsJson = JsonSerializer.Serialize(monthlyDtos);
        snapshot.ClinicalComplexityJson = JsonSerializer.Serialize(clinicalComplexity);
        snapshot.RefreshedAt = DateTimeOffset.UtcNow;
    }

    private static async Task RefreshPathwayAggregatesAsync(EmhipDbContext db, Guid hubId, CancellationToken cancellationToken)
    {
        var monthlyCategoryCounts = await db.PathwayReferrals.AsNoTracking()
            .Where(p => db.Guests.Any(g => g.Id == p.GuestId && g.HubId == hubId))
            .GroupBy(p => new { p.Category, p.ReferredAt.Year, p.ReferredAt.Month })
            .Select(g => new { g.Key.Category, g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToListAsync(cancellationToken);

        foreach (var bucket in monthlyCategoryCounts)
        {
            var aggregate = await db.PathwayReportAggregates.FirstOrDefaultAsync(
                p => p.HubId == hubId && p.Category == bucket.Category && p.Year == bucket.Year && p.Month == bucket.Month, cancellationToken);

            if (aggregate is null)
            {
                aggregate = new PathwayReportAggregate { Id = Guid.NewGuid(), HubId = hubId, Category = bucket.Category, Year = bucket.Year, Month = bucket.Month };
                db.PathwayReportAggregates.Add(aggregate);
            }

            aggregate.ReferralCount = bucket.Count;
        }
    }
}
