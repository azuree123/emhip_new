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

        // Distribution across the three clinical pathways the service model defines — not the
        // practical-support referral categories, which are a different axis entirely.
        var pathwayCounts = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && !g.IsDeleted && g.Pathway != null)
            .GroupBy(g => g.Pathway!.Value)
            .Select(g => new { Pathway = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var totalAllocated = pathwayCounts.Sum(p => p.Count);
        var pathwayDtos = new[] { GuestPathway.MentalWellbeing, GuestPathway.ClinicalSupport, GuestPathway.CommunityRecovery }
            .Select(pathway =>
            {
                var count = pathwayCounts.FirstOrDefault(p => p.Pathway == pathway)?.Count ?? 0;
                return new PathwayDistributionDto(
                    PathwayLabel(pathway), count,
                    totalAllocated == 0 ? 0 : Math.Round(100.0 * count / totalAllocated, 1));
            })
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

        var demographics = await BuildDemographicsAsync(db, hubId, cancellationToken);
        var dataQuality = await BuildDataQualityAsync(db, hubId, inactivityDays: 90, cancellationToken);

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
        snapshot.DemographicsJson = JsonSerializer.Serialize(demographics);
        snapshot.DataQualityJson = JsonSerializer.Serialize(dataQuality);
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

    private static string PathwayLabel(GuestPathway pathway) => Emhip.Application.Guests.GuestPathwayLabels.For(pathway);

    /// <summary>
    /// Guest demographics card. Age is bucketed from the date of birth here rather than stored,
    /// and each breakdown keeps the top slices so one card stays readable.
    /// </summary>
    private static async Task<GuestDemographicsBreakdownDto> BuildDemographicsAsync(
        EmhipDbContext db, Guid hubId, CancellationToken cancellationToken)
    {
        var rows = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && !g.IsDeleted)
            .Select(g => new
            {
                g.DateOfBirth,
                g.Gender,
                Ethnicity = db.GuestDemographics.Where(d => d.GuestId == g.Id).Select(d => d.Ethnicity).FirstOrDefault(),
                Country = db.GuestDemographics.Where(d => d.GuestId == g.Id).Select(d => d.CountryOfOrigin).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        static IReadOnlyList<DemographicSliceDto> Top(IEnumerable<string?> values, int take)
        {
            var named = values.Where(v => !string.IsNullOrWhiteSpace(v)).Select(v => v!).ToList();
            var total = named.Count;
            return named
                .GroupBy(v => v)
                .OrderByDescending(g => g.Count())
                .Take(take)
                .Select(g => new DemographicSliceDto(g.Key, g.Count(), total == 0 ? 0 : Math.Round(100.0 * g.Count() / total, 1)))
                .ToList();
        }

        static string Band(DateOnly dob, DateOnly today)
        {
            var age = today.Year - dob.Year;
            if (dob > today.AddYears(-age)) age--;
            return age switch
            {
                < 18 => "Under 18",
                < 25 => "18–24",
                < 35 => "25–34",
                < 45 => "35–44",
                < 55 => "45–54",
                < 65 => "55–64",
                _ => "65 and over",
            };
        }

        var bandOrder = new[] { "Under 18", "18–24", "25–34", "35–44", "45–54", "55–64", "65 and over" };
        var bands = rows.Select(r => Band(r.DateOfBirth, today)).ToList();
        var ageGroups = bandOrder
            .Select(band => new DemographicSliceDto(
                band, bands.Count(b => b == band),
                bands.Count == 0 ? 0 : Math.Round(100.0 * bands.Count(b => b == band) / bands.Count, 1)))
            .Where(slice => slice.Count > 0)
            .ToList();

        return new GuestDemographicsBreakdownDto(
            Top(rows.Select(r => r.Ethnicity), 8),
            ageGroups,
            Top(rows.Select(r => r.Gender), 6),
            Top(rows.Select(r => r.Country), 8));
    }

    /// <summary>The four checks the design's "Data quality issues" card lists.</summary>
    private static async Task<List<DataQualityIssueTileDto>> BuildDataQualityAsync(
        EmhipDbContext db, Guid hubId, int inactivityDays, CancellationToken cancellationToken)
    {
        var guests = db.Guests.AsNoTracking().Where(g => g.HubId == hubId && !g.IsDeleted);

        return
        [
            new("missingPathway", "Missing pathway classification",
                await guests.CountAsync(g => g.Pathway == null, cancellationToken)),
            new("missingInitialConversation", "Initial conversation not completed",
                await guests.CountAsync(g => !db.InitialConversationRecords.Any(r => r.GuestId == g.Id), cancellationToken)),
            new("missingDialogBaseline", "Missing DIALOG baseline score",
                await guests.CountAsync(g => !db.DialogAssessments.Any(d => d.GuestId == g.Id), cancellationToken)),
            new("autoOnHold", "Guests automatically moved to Inactive",
                await guests.CountAsync(g => g.Status == GuestStatus.OnHold, cancellationToken)),
        ];
    }
}
