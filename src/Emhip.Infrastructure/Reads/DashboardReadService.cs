using System.Text.Json;
using Emhip.Application.Dashboards;
using Emhip.Application.UrgentCases;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Reads the precomputed DashboardSnapshots_ReadModel row for the hub (refreshed by
/// ReportMaterializerWorker) — never a live GROUP BY over guest history. See
/// ARCHITECTURE.md "Read-model tables for dashboards".
/// </summary>
public sealed class DashboardReadService(EmhipDbContext db, IUrgentCaseReadService urgentCases) : IDashboardReadService
{
    public async Task<GuestsSeenDto> GetGuestsSeenAsync(Guid hubId, GuestsSeenPeriod period, Guid? cmhwStaffId = null, CancellationToken cancellationToken = default)
    {
        // Live, but narrow: an OccurredAt-indexed range scan over at most a month of contacts.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var from = period switch
        {
            GuestsSeenPeriod.Today => today,
            GuestsSeenPeriod.Week => today.AddDays(-6),
            _ => today.AddDays(-29),
        };
        var fromTs = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

        var contacts = db.Contacts.AsNoTracking()
            .Where(c => c.OccurredAt >= fromTs
                && db.Guests.Any(g => g.Id == c.GuestId && g.HubId == hubId));
        if (cmhwStaffId is not null)
        {
            contacts = contacts.Where(c => c.CreatedByStaffId == cmhwStaffId);
        }

        var rows = await contacts
            .Select(c => new { c.GuestId, c.OccurredAt })
            .ToListAsync(cancellationToken);

        var perDay = rows
            .GroupBy(r => DateOnly.FromDateTime(r.OccurredAt.UtcDateTime))
            .ToDictionary(g => g.Key, g => g.Select(r => r.GuestId).Distinct().Count());

        var series = Enumerable.Range(0, today.DayNumber - from.DayNumber + 1)
            .Select(offset => from.AddDays(offset))
            .Select(date => new GuestsSeenPointDto(date, perDay.GetValueOrDefault(date)))
            .ToList();

        return new GuestsSeenDto(
            period, from, today,
            rows.Select(r => r.GuestId).Distinct().Count(),
            rows.Count,
            series);
    }

    public async Task<CmhwDashboardDto> GetCmhwDashboardAsync(Guid staffId, Guid hubId, CancellationToken cancellationToken = default)
    {
        var snapshot = await db.DashboardSnapshots.AsNoTracking()
            .FirstOrDefaultAsync(s => s.HubId == hubId, cancellationToken);

        var activeGuests = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && g.AssignedCmhwId == staffId && g.Status != GuestStatus.Inactive)
            .OrderByDescending(g => g.RegisteredAt)
            .Take(25)
            .Select(g => new ActiveGuestRowDto(
                g.Id, g.FirstName + " " + g.LastName, g.Status.ToString(),
                db.Contacts.Where(c => c.GuestId == g.Id).OrderByDescending(c => c.OccurredAt).Select(c => (DateTimeOffset?)c.OccurredAt).FirstOrDefault(),
                db.FollowUps.Where(f => f.GuestId == g.Id && f.Status == FollowUpStatus.Scheduled).OrderBy(f => f.DueDate).Select(f => (DateOnly?)f.DueDate).FirstOrDefault()))
            .ToListAsync(cancellationToken);

        var urgentBanner = await urgentCases.GetActiveUrgentCasesAsync(hubId, cancellationToken);

        return new CmhwDashboardDto(
            snapshot?.TotalActiveGuests ?? 0,
            snapshot?.PendingConversationGuests ?? 0,
            snapshot?.InactiveGuests ?? 0,
            snapshot?.UrgentGuests ?? 0,
            activeGuests,
            urgentBanner.Take(5).ToList(),
            DeserializeClinicalComplexity(snapshot));
    }

    private static List<ClinicalIndicatorDto> DeserializeClinicalComplexity(ReadModels.DashboardSnapshot? snapshot) =>
        snapshot is null
            ? []
            : JsonSerializer.Deserialize<List<ClinicalIndicatorDto>>(snapshot.ClinicalComplexityJson) ?? [];

    public async Task<HubManagerDashboardDto> GetHubManagerDashboardAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        var snapshot = await db.DashboardSnapshots.AsNoTracking()
            .FirstOrDefaultAsync(s => s.HubId == hubId, cancellationToken);

        var pathwayDistribution = snapshot is null
            ? []
            : JsonSerializer.Deserialize<List<PathwayDistributionDto>>(snapshot.PathwayDistributionJson) ?? [];

        var monthlyStats = snapshot is null
            ? []
            : JsonSerializer.Deserialize<List<MonthlyStatDto>>(snapshot.MonthlyStatsJson) ?? [];

        var recentActivity = await db.AuditEvents.AsNoTracking()
            .Where(a => a.GuestId != null && db.Guests.Any(g => g.Id == a.GuestId && g.HubId == hubId))
            .OrderByDescending(a => a.OccurredAt)
            .Take(15)
            .Select(a => new RecentActivityDto(
                a.Action.ToString() + " " + a.EntityName,
                db.Users.Where(s => s.Id == a.ActorStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "System",
                a.OccurredAt))
            .ToListAsync(cancellationToken);

        return new HubManagerDashboardDto(
            snapshot?.TotalGuestsAcrossHub ?? 0,
            snapshot?.TotalActiveGuests ?? 0,
            snapshot?.PendingConversationGuests ?? 0,
            snapshot?.InactiveGuests ?? 0,
            snapshot?.UrgentGuests ?? 0,
            pathwayDistribution,
            monthlyStats,
            recentActivity,
            DeserializeClinicalComplexity(snapshot));
    }
}
