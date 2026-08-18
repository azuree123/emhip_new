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

    public async Task<DialogOutcomesReportDto> GetDialogOutcomesAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        // Baselines = version 1; follow-up cohort = each guest's highest version above 1.
        // Guest-scoped cardinality (a handful of versions per guest), so a live aggregate is fine here.
        var baseline = await db.DialogAssessments.AsNoTracking()
            .Where(d => d.Version == 1 && db.Guests.Any(g => g.Id == d.GuestId && g.HubId == hubId && !g.IsDeleted))
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                MentalHealth = g.Average(d => (double)d.MentalHealth),
                PhysicalHealth = g.Average(d => (double)d.PhysicalHealth),
                JobSituation = g.Average(d => (double)d.JobSituation),
                Accommodation = g.Average(d => (double)d.Accommodation),
                LeisureActivities = g.Average(d => (double)d.LeisureActivities),
                FriendshipsSocialLife = g.Average(d => (double)d.FriendshipsSocialLife),
                RelationshipWithFamily = g.Average(d => (double)d.RelationshipWithFamily),
                PersonalSafety = g.Average(d => (double)d.PersonalSafety),
                PracticalHelp = g.Average(d => (double)d.PracticalHelp),
                Medication = g.Average(d => (double)d.Medication),
                MeetingsWithMhStaff = g.Average(d => (double)d.MeetingsWithMhStaff),
            })
            .FirstOrDefaultAsync(cancellationToken);

        var latest = await db.DialogAssessments.AsNoTracking()
            .Where(d => d.Version > 1
                && d.Version == db.DialogAssessments.Where(x => x.GuestId == d.GuestId).Max(x => x.Version)
                && db.Guests.Any(g => g.Id == d.GuestId && g.HubId == hubId && !g.IsDeleted))
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Count = g.Count(),
                MentalHealth = g.Average(d => (double)d.MentalHealth),
                PhysicalHealth = g.Average(d => (double)d.PhysicalHealth),
                JobSituation = g.Average(d => (double)d.JobSituation),
                Accommodation = g.Average(d => (double)d.Accommodation),
                LeisureActivities = g.Average(d => (double)d.LeisureActivities),
                FriendshipsSocialLife = g.Average(d => (double)d.FriendshipsSocialLife),
                RelationshipWithFamily = g.Average(d => (double)d.RelationshipWithFamily),
                PersonalSafety = g.Average(d => (double)d.PersonalSafety),
                PracticalHelp = g.Average(d => (double)d.PracticalHelp),
                Medication = g.Average(d => (double)d.Medication),
                MeetingsWithMhStaff = g.Average(d => (double)d.MeetingsWithMhStaff),
            })
            .FirstOrDefaultAsync(cancellationToken);

        double? Round(double? value) => value is null ? null : Math.Round(value.Value, 2);

        DialogDimensionDto Dim(string key, string label, double? b, double? l) => new(key, label, Round(b), Round(l));

        return new DialogOutcomesReportDto(
            baseline?.Count ?? 0,
            latest?.Count ?? 0,
            [
                Dim("mentalHealth", "Mental health", baseline?.MentalHealth, latest?.MentalHealth),
                Dim("physicalHealth", "Physical health", baseline?.PhysicalHealth, latest?.PhysicalHealth),
                Dim("jobSituation", "Job situation", baseline?.JobSituation, latest?.JobSituation),
                Dim("accommodation", "Accommodation", baseline?.Accommodation, latest?.Accommodation),
                Dim("leisureActivities", "Leisure activities", baseline?.LeisureActivities, latest?.LeisureActivities),
                Dim("friendshipsSocialLife", "Friendships & social life", baseline?.FriendshipsSocialLife, latest?.FriendshipsSocialLife),
                Dim("relationshipWithFamily", "Relationship with family", baseline?.RelationshipWithFamily, latest?.RelationshipWithFamily),
                Dim("personalSafety", "Personal safety", baseline?.PersonalSafety, latest?.PersonalSafety),
                Dim("practicalHelp", "Practical help", baseline?.PracticalHelp, latest?.PracticalHelp),
                Dim("medication", "Medication", baseline?.Medication, latest?.Medication),
                Dim("meetingsWithMhStaff", "Meetings with MH staff", baseline?.MeetingsWithMhStaff, latest?.MeetingsWithMhStaff),
            ]);
    }

    public async Task<PathwayAnalyticsDto> GetPathwayAnalyticsAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        // Live aggregates over indexed columns — this tab is loaded on demand, not on every dashboard hit.
        var rows = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId && g.Pathway != null)
            .GroupBy(g => g.Pathway!)
            .Select(grp => new
            {
                Pathway = grp.Key,
                Total = grp.Count(),
                Active = grp.Count(g => g.Status == Domain.Enums.GuestStatus.Active),
                Urgent = grp.Count(g => g.Status == Domain.Enums.GuestStatus.Urgent),
                Inactive = grp.Count(g => g.Status == Domain.Enums.GuestStatus.Inactive),
                Afa = grp.Count(g => g.AfaSupportNeeded),
            })
            .ToListAsync(cancellationToken);

        var dialogAverages = await db.DialogAssessments.AsNoTracking()
            .Where(d => d.Version == db.DialogAssessments.Where(x => x.GuestId == d.GuestId).Max(x => x.Version))
            .Join(db.Guests.Where(g => g.HubId == hubId && g.Pathway != null), d => d.GuestId, g => g.Id, (d, g) => new { g.Pathway, Total = d.MentalHealth + d.PhysicalHealth + d.JobSituation + d.Accommodation + d.LeisureActivities + d.FriendshipsSocialLife + d.RelationshipWithFamily + d.PersonalSafety + d.PracticalHelp + d.Medication + d.MeetingsWithMhStaff })
            .GroupBy(x => x.Pathway!)
            .Select(grp => new { Pathway = grp.Key, Avg = grp.Average(x => (double)x.Total) })
            .ToListAsync(cancellationToken);

        var unallocated = await db.Guests.AsNoTracking()
            .CountAsync(g => g.HubId == hubId && g.Pathway == null, cancellationToken);

        return new PathwayAnalyticsDto(
            unallocated,
            rows.Select(r => new PathwayAnalyticsRowDto(
                r.Pathway.ToString()!, r.Total, r.Active, r.Urgent, r.Inactive, r.Afa,
                dialogAverages.Where(a => a.Pathway == r.Pathway).Select(a => (double?)Math.Round(a.Avg, 1)).FirstOrDefault()))
                .OrderByDescending(r => r.TotalGuests)
                .ToList());
    }

    public async Task<IReadOnlyList<CaseloadReportRowDto>> GetCaseloadReportAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo = DateTimeOffset.UtcNow.AddDays(-30);

        return await db.Users.AsNoTracking()
            .Where(u => u.HubId == hubId && u.IsActive)
            .Select(u => new CaseloadReportRowDto(
                u.Id,
                u.DisplayName,
                db.Guests.Count(g => g.AssignedCmhwId == u.Id),
                db.Guests.Count(g => g.AssignedCmhwId == u.Id && g.Status == Domain.Enums.GuestStatus.Active),
                db.Guests.Count(g => g.AssignedCmhwId == u.Id && g.Status == Domain.Enums.GuestStatus.Urgent),
                db.FollowUps.Count(f => f.AssigneeStaffId == u.Id && f.Status == Domain.Enums.FollowUpStatus.Scheduled && f.DueDate < today),
                db.Contacts.Count(c => c.CreatedByStaffId == u.Id && c.OccurredAt >= thirtyDaysAgo)))
            .OrderByDescending(r => r.AssignedGuests)
            .ToListAsync(cancellationToken);
    }

    public async Task<DataQualityReportDto> GetDataQualityReportAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        var guests = db.Guests.AsNoTracking().Where(g => g.HubId == hubId);
        var total = await guests.CountAsync(cancellationToken);
        var ninetyDaysAgo = DateTimeOffset.UtcNow.AddDays(-90);

        var issues = new List<DataQualityIssueDto>
        {
            new("missingDemographics", "No demographics recorded",
                await guests.CountAsync(g => !db.GuestDemographics.Any(d => d.GuestId == g.Id), cancellationToken)),
            new("missingInitialConversation", "Initial conversation not completed",
                await guests.CountAsync(g => !db.InitialConversationRecords.Any(r => r.GuestId == g.Id), cancellationToken)),
            new("missingDialogBaseline", "No DIALOG baseline assessment",
                await guests.CountAsync(g => !db.DialogAssessments.Any(d => d.GuestId == g.Id), cancellationToken)),
            new("missingPathway", "No pathway allocated",
                await guests.CountAsync(g => g.Pathway == null, cancellationToken)),
            new("missingCmhw", "No CMHW assigned",
                await guests.CountAsync(g => g.AssignedCmhwId == null, cancellationToken)),
            new("noRecentContact", "No contact in the last 90 days",
                await guests.CountAsync(g => g.Status == Domain.Enums.GuestStatus.Active
                    && !db.Contacts.Any(c => c.GuestId == g.Id && c.OccurredAt >= ninetyDaysAgo), cancellationToken)),
            new("missingReferralSource", "No referral source recorded",
                await guests.CountAsync(g => g.ReferralSource == null, cancellationToken)),
        };

        return new DataQualityReportDto(total, issues);
    }

    public async Task<ContactsBreakdownReportDto> GetContactsBreakdownAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default)
    {
        var fromTs = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var toTs = new DateTimeOffset(to.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);

        var contacts = db.Contacts.AsNoTracking()
            .Where(c => c.OccurredAt >= fromTs && c.OccurredAt <= toTs
                && db.Guests.Any(g => g.Id == c.GuestId && g.HubId == hubId));

        var byType = await contacts.GroupBy(c => c.Type)
            .Select(grp => new { Label = grp.Key, Count = grp.Count() })
            .ToListAsync(cancellationToken);
        var byOutcome = await contacts.GroupBy(c => c.Outcome)
            .Select(grp => new { Label = grp.Key, Count = grp.Count() })
            .ToListAsync(cancellationToken);

        var total = byType.Sum(t => t.Count);
        double Pct(int count) => total == 0 ? 0 : Math.Round(100.0 * count / total, 1);

        return new ContactsBreakdownReportDto(
            from, to, total,
            byType.OrderByDescending(t => t.Count).Select(t => new BreakdownSliceDto(t.Label.ToString(), t.Count, Pct(t.Count))).ToList(),
            byOutcome.OrderByDescending(o => o.Count).Select(o => new BreakdownSliceDto(o.Label.ToString(), o.Count, Pct(o.Count))).ToList());
    }

    public async Task<IReadOnlyList<DialogTrendPointDto>> GetDialogTrendAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        var points = await db.DialogAssessments.AsNoTracking()
            .Where(d => db.Guests.Any(g => g.Id == d.GuestId && g.HubId == hubId))
            .GroupBy(d => new { d.AssessedAt.Year, d.AssessedAt.Month })
            .Select(grp => new
            {
                grp.Key.Year,
                grp.Key.Month,
                Avg = grp.Average(d => (double)(d.MentalHealth + d.PhysicalHealth + d.JobSituation + d.Accommodation + d.LeisureActivities + d.FriendshipsSocialLife + d.RelationshipWithFamily + d.PersonalSafety + d.PracticalHelp + d.Medication + d.MeetingsWithMhStaff)),
                Count = grp.Count(),
            })
            .OrderBy(p => p.Year).ThenBy(p => p.Month)
            .ToListAsync(cancellationToken);

        return points.Select(p => new DialogTrendPointDto(p.Year, p.Month, Math.Round(p.Avg, 1), p.Count)).ToList();
    }

    public async Task<IReadOnlyList<BreakdownSliceDto>> GetReferralSourcesAsync(Guid hubId, CancellationToken cancellationToken = default)
    {
        var rows = await db.Guests.AsNoTracking()
            .Where(g => g.HubId == hubId)
            .GroupBy(g => g.ReferralSource ?? "Not recorded")
            .Select(grp => new { Label = grp.Key, Count = grp.Count() })
            .ToListAsync(cancellationToken);

        var total = rows.Sum(r => r.Count);
        return rows.OrderByDescending(r => r.Count)
            .Select(r => new BreakdownSliceDto(r.Label, r.Count, total == 0 ? 0 : Math.Round(100.0 * r.Count / total, 1)))
            .ToList();
    }

    public async Task<IReadOnlyList<ExportHistoryItemDto>> GetExportHistoryAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await db.ExportRecords.AsNoTracking()
            .Where(e => e.HubId == hubId)
            .OrderByDescending(e => e.ExportedAt)
            .Take(50)
            .Select(e => new ExportHistoryItemDto(
                e.Id, e.ExportedAt,
                db.Users.Where(u => u.Id == e.ExportedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                e.ExportType, e.FromDate, e.ToDate))
            .ToListAsync(cancellationToken);

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
