using System.Text.Json;
using Emhip.Application.Dashboards;
using Emhip.Application.Reports;
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
public sealed class DashboardReadService(EmhipDbContext db, IUrgentCaseReadService urgentCases, IReportReadService reports) : IDashboardReadService
{
    public async Task<GuestsSeenDto> GetGuestsSeenAsync(
        Guid hubId, GuestsSeenPeriod period, Guid? cmhwStaffId = null,
        DateOnly? customFrom = null, DateOnly? customTo = null, CancellationToken cancellationToken = default)
    {
        // Live, but narrow: an OccurredAt-indexed range scan. A supplied custom range wins over
        // the preset period (spec §5.1).
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var usingCustomRange = customFrom is not null || customTo is not null;
        var from = usingCustomRange
            ? customFrom ?? today.AddDays(-29)
            : period switch
            {
                GuestsSeenPeriod.Today => today,
                GuestsSeenPeriod.Week => today.AddDays(-6),
                _ => today.AddDays(-29),
            };
        var to = usingCustomRange ? customTo ?? today : today;
        if (to < from) (from, to) = (to, from);
        if (usingCustomRange) period = GuestsSeenPeriod.Custom;

        var fromTs = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var toTs = new DateTimeOffset(to.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var contacts = db.Contacts.AsNoTracking()
            .Where(c => c.OccurredAt >= fromTs && c.OccurredAt <= toTs
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

        var series = Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(offset => from.AddDays(offset))
            .Select(date => new GuestsSeenPointDto(date, perDay.GetValueOrDefault(date)))
            .ToList();

        return new GuestsSeenDto(
            period, from, to,
            rows.Select(r => r.GuestId).Distinct().Count(),
            rows.Count,
            series);
    }

    public async Task<CmhwDashboardDto> GetCmhwDashboardAsync(Guid staffId, Guid hubId, CancellationToken cancellationToken = default)
    {
        var snapshot = await db.DashboardSnapshots.AsNoTracking()
            .FirstOrDefaultAsync(s => s.HubId == hubId, cancellationToken);

        var activeGuests = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && g.AssignedCmhwId == staffId && g.Status != GuestStatus.OnHold)
            .OrderByDescending(g => g.RegisteredAt)
            .Take(25)
            .Select(g => new ActiveGuestRowDto(
                g.Id, g.FirstName + " " + g.LastName, g.Status.ToString(),
                db.Contacts.Where(c => c.GuestId == g.Id).OrderByDescending(c => c.OccurredAt).Select(c => (DateTimeOffset?)c.OccurredAt).FirstOrDefault(),
                db.FollowUps.Where(f => f.GuestId == g.Id && (f.Status == FollowUpStatus.Scheduled || f.Status == FollowUpStatus.Overdue)).OrderBy(f => f.DueDate).Select(f => (DateOnly?)f.DueDate).FirstOrDefault()))
            .ToListAsync(cancellationToken);

        var urgentBanner = await urgentCases.GetActiveUrgentCasesAsync(hubId, cancellationToken);

        // The worker's own caseload counts — live, and narrow (one indexed GROUP BY over the
        // guests assigned to them) — rather than the hub-wide snapshot the Hub Manager sees.
        var mine = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && g.AssignedCmhwId == staffId)
            .GroupBy(g => g.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Urgent = g.Count(x => x.IsUrgent) })
            .ToListAsync(cancellationToken);
        int CountOf(GuestStatus status) => mine.FirstOrDefault(m => m.Status == status)?.Count ?? 0;

        return new CmhwDashboardDto(
            CountOf(GuestStatus.Active),
            CountOf(GuestStatus.New),
            CountOf(GuestStatus.OnHold),
            mine.Sum(m => m.Urgent),
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

        // Opening one record logs a read per tab it loads, so read a wider window and collapse
        // consecutive repeats (same person, same guest, same wording) into one line.
        var auditRows = await db.AuditEvents.AsNoTracking()
            .Where(a => a.GuestId != null && db.Guests.Any(g => g.Id == a.GuestId && g.HubId == hubId))
            .OrderByDescending(a => a.OccurredAt)
            .Take(200)
            .Select(a => new
            {
                Action = a.Action.ToString(),
                a.EntityName,
                a.Details,
                a.OccurredAt,
                a.GuestId,
                ActorName = db.Users.Where(s => s.Id == a.ActorStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "System",
                Guest = db.Guests.Where(g => g.Id == a.GuestId)
                    .Select(g => new { Name = g.FirstName + " " + g.LastName, g.GuestNumber }).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        var recentActivity = new List<RecentActivityDto>();
        foreach (var row in auditRows)
        {
            var description = Emhip.Application.Audit.AuditDescriptions.Describe(row.Action, row.EntityName, row.Details);
            var previous = recentActivity.Count > 0 ? recentActivity[^1] : null;
            if (previous is not null && previous.GuestId == row.GuestId
                && previous.ActorName == row.ActorName && previous.Description == description)
            {
                continue;
            }

            recentActivity.Add(new RecentActivityDto(
                description, row.ActorName, row.OccurredAt, row.GuestId, row.Guest?.Name, row.Guest?.GuestNumber));
            if (recentActivity.Count == 15) break;
        }

        return new HubManagerDashboardDto(
            snapshot?.TotalGuestsAcrossHub ?? 0,
            snapshot?.TotalActiveGuests ?? 0,
            snapshot?.PendingConversationGuests ?? 0,
            snapshot?.InactiveGuests ?? 0,
            snapshot?.UrgentGuests ?? 0,
            pathwayDistribution,
            monthlyStats,
            recentActivity,
            DeserializeClinicalComplexity(snapshot),
            snapshot is null
                ? new GuestDemographicsBreakdownDto([], [], [], [])
                : JsonSerializer.Deserialize<GuestDemographicsBreakdownDto>(snapshot.DemographicsJson)
                  ?? new GuestDemographicsBreakdownDto([], [], [], []),
            snapshot is null
                ? []
                : JsonSerializer.Deserialize<List<DataQualityIssueTileDto>>(snapshot.DataQualityJson) ?? [],
            await BuildCpnInvolvementAsync(hubId, cancellationToken),
            // "Caseload per CMHW" — the same per-worker rows the Caseload report shows, so the
            // manager sees every worker's assigned cases without leaving the dashboard.
            await reports.GetCaseloadReportAsync(hubId, cancellationToken));
    }

    /// <summary>
    /// Live, but narrow: CPN activity is a small slice of the record (one profile flag, one Part 1
    /// per guest, the CPN-tagged casework notes), so it is read directly rather than materialized.
    /// </summary>
    private async Task<CpnInvolvementDto> BuildCpnInvolvementAsync(Guid hubId, CancellationToken cancellationToken)
    {
        var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);
        var hubGuests = db.Guests.AsNoTracking().Where(g => g.HubId == hubId && !g.IsDeleted);

        var guestsWithCpn = await db.GuestClinicalProfiles.AsNoTracking()
            .CountAsync(p => p.CpnInvolved && hubGuests.Any(g => g.Id == p.GuestId), cancellationToken);

        var assessments = await db.CpnInitialAssessments.AsNoTracking()
            .CountAsync(a => a.Status == CpnAssessmentStatus.Submitted && hubGuests.Any(g => g.Id == a.GuestId), cancellationToken);

        var submittedNotes = db.CaseworkNotes.AsNoTracking()
            .Where(n => n.Status == CaseworkNoteStatus.Submitted && hubGuests.Any(g => g.Id == n.GuestId));

        var sessions30 = await submittedNotes
            .CountAsync(n => n.IsCpnContact && n.OccurredAt >= thirtyDaysAgo, cancellationToken);

        var referrals30 = await submittedNotes
            .CountAsync(n => n.CpnReferralRequested && n.SubmittedAt != null && n.SubmittedAt >= thirtyDaysAgo, cancellationToken);

        var guests = await hubGuests
            .Where(g => db.GuestClinicalProfiles.Any(p => p.GuestId == g.Id && p.CpnInvolved)
                || db.CpnInitialAssessments.Any(a => a.GuestId == g.Id && a.Status == CpnAssessmentStatus.Submitted)
                || db.CaseworkNotes.Any(n => n.GuestId == g.Id && n.IsCpnContact && n.Status == CaseworkNoteStatus.Submitted))
            .Select(g => new CpnInvolvedGuestDto(
                g.Id,
                g.GuestNumber,
                g.FirstName + " " + g.LastName,
                g.Status.ToString(),
                db.Users.Where(u => u.Id == g.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault(),
                db.CaseworkNotes
                    .Where(n => n.GuestId == g.Id && n.IsCpnContact && n.Status == CaseworkNoteStatus.Submitted)
                    .OrderByDescending(n => n.OccurredAt)
                    .Select(n => (DateTimeOffset?)n.OccurredAt)
                    .FirstOrDefault(),
                db.CpnInitialAssessments.Any(a => a.GuestId == g.Id && a.Status == CpnAssessmentStatus.Submitted),
                db.CaseworkNotes.Count(n => n.GuestId == g.Id && n.IsCpnContact && n.Status == CaseworkNoteStatus.Submitted)))
            .ToListAsync(cancellationToken);

        // Ordering by a constructor-projected member doesn't translate — sort the short list in memory.
        var recent = guests
            .OrderByDescending(g => g.LastCpnContactAt ?? DateTimeOffset.MinValue)
            .ThenBy(g => g.Name)
            .Take(8)
            .ToList();

        return new CpnInvolvementDto(guestsWithCpn, assessments, sessions30, referrals30, recent);
    }
}
