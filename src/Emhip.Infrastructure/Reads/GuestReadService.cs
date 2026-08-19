using Dapper;
using Emhip.Application.Common;
using Emhip.Application.Guests;
using Emhip.Application.Guests.Actions;
using Emhip.Application.Guests.Casework;
using Emhip.Application.Guests.Dialog;
using Emhip.Application.Guests.Dtos;
using Emhip.Application.Guests.Pathways;
using Emhip.Domain.Enums;
using Emhip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Emhip.Infrastructure.Reads;

/// <summary>
/// Read side of the Guest aggregate. The list query is hand-written Dapper SQL using keyset
/// pagination (never OFFSET/FETCH — see ARCHITECTURE.md); the single-guest workspace-tab
/// queries use EF Core `AsNoTracking()` projections, which is fast enough at guest-scoped
/// cardinality and keeps the mapping code simpler.
/// </summary>
public sealed class GuestReadService(ISqlConnectionFactory connectionFactory, EmhipDbContext db) : IGuestReadService
{
    private sealed record GuestCursor(string LastName, string FirstName, Guid Id);

    public async Task<KeysetPage<GuestListItemDto>> GetGuestListAsync(
        Guid hubId, string? searchText, GuestStatus? status, string? cursor, int pageSize,
        PathwayCategory? pathway = null, bool? hasRiskFlags = null, Guid? assignedCmhwId = null,
        int? lastActivityWithinDays = null, CancellationToken cancellationToken = default)
    {
        var decodedCursor = KeysetCursor.Decode<GuestCursor>(cursor);

        const string sql = """
            SELECT TOP (@FetchSize)
                g.Id, g.GuestNumber, g.FirstName, g.LastName, g.DateOfBirth, g.Status,
                s.DisplayName AS AssignedCmhwName, g.RegisteredAt, lc.OccurredAt AS LastContactAt,
                pw.Category AS PathwayCategory, ISNULL(rk.HasFlags, 0) AS HasRiskFlags, nf.DueDate AS NextContactDue
            FROM Guests g
            LEFT JOIN AspNetUsers s ON s.Id = g.AssignedCmhwId
            OUTER APPLY (
                SELECT TOP 1 c.OccurredAt FROM Contacts c WHERE c.GuestId = g.Id ORDER BY c.OccurredAt DESC
            ) lc
            OUTER APPLY (
                SELECT TOP 1 p.Category FROM PathwayReferrals p WHERE p.GuestId = g.Id ORDER BY p.ReferredAt DESC
            ) pw
            OUTER APPLY (
                SELECT TOP 1 CAST(CASE WHEN r.SuicidalIdeation = 1 OR r.SelfHarm = 1 OR r.RiskToOthers = 1
                    OR r.SevereDeterioration = 1 OR r.SafeguardingConcern = 1 THEN 1 ELSE 0 END AS bit) AS HasFlags
                FROM RiskAssessments r WHERE r.GuestId = g.Id ORDER BY r.Version DESC
            ) rk
            OUTER APPLY (
                SELECT TOP 1 f.DueDate FROM FollowUps f
                WHERE f.GuestId = g.Id AND f.Status = 'Scheduled' ORDER BY f.DueDate
            ) nf
            WHERE g.HubId = @HubId AND g.IsDeleted = 0
                AND (@Status IS NULL OR g.Status = @Status)
                AND (@SearchPattern IS NULL OR g.FirstName LIKE @SearchPattern OR g.LastName LIKE @SearchPattern)
                AND (@Pathway IS NULL OR pw.Category = @Pathway)
                AND (@HasRiskFlags IS NULL OR ISNULL(rk.HasFlags, 0) = @HasRiskFlags)
                AND (@AssignedCmhwId IS NULL OR g.AssignedCmhwId = @AssignedCmhwId)
                AND (@LastContactAfter IS NULL OR lc.OccurredAt >= @LastContactAfter)
                AND (
                    @HasCursor = 0
                    OR g.LastName > @LastName
                    OR (g.LastName = @LastName AND g.FirstName > @FirstName)
                    OR (g.LastName = @LastName AND g.FirstName = @FirstName AND g.Id > @Id)
                )
            ORDER BY g.LastName, g.FirstName, g.Id
            """;

        using var connection = connectionFactory.CreateConnection();
        var rows = (await connection.QueryAsync<GuestListRow>(sql, new
        {
            HubId = hubId,
            Status = status?.ToString(),
            SearchPattern = string.IsNullOrWhiteSpace(searchText) ? null : $"%{searchText}%",
            Pathway = pathway?.ToString(),
            HasRiskFlags = hasRiskFlags,
            AssignedCmhwId = assignedCmhwId,
            LastContactAfter = lastActivityWithinDays.HasValue
                ? (DateTimeOffset?)DateTimeOffset.UtcNow.AddDays(-lastActivityWithinDays.Value)
                : null,
            HasCursor = decodedCursor is not null,
            LastName = decodedCursor?.LastName ?? string.Empty,
            FirstName = decodedCursor?.FirstName ?? string.Empty,
            Id = decodedCursor?.Id ?? Guid.Empty,
            FetchSize = pageSize + 1,
        })).ToList();

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize).ToList();
        var nextCursor = hasMore
            ? KeysetCursor.Encode(new GuestCursor(page[^1].LastName, page[^1].FirstName, page[^1].Id))
            : null;

        // Total only on the first page — an indexed COUNT with the same filters; later pages
        // skip it and the client carries the first page's value forward.
        int? totalCount = null;
        if (decodedCursor is null)
        {
            // Include the per-row applies only when their filter is actually set — the common
            // unfiltered count stays a pure index scan over Guests.
            var applies = string.Empty;
            var predicates = string.Empty;
            if (pathway is not null)
            {
                applies += "\nOUTER APPLY (SELECT TOP 1 p.Category FROM PathwayReferrals p WHERE p.GuestId = g.Id ORDER BY p.ReferredAt DESC) pw";
                predicates += "\n    AND pw.Category = @Pathway";
            }
            if (hasRiskFlags is not null)
            {
                applies += """

                    OUTER APPLY (
                        SELECT TOP 1 CAST(CASE WHEN r.SuicidalIdeation = 1 OR r.SelfHarm = 1 OR r.RiskToOthers = 1
                            OR r.SevereDeterioration = 1 OR r.SafeguardingConcern = 1 THEN 1 ELSE 0 END AS bit) AS HasFlags
                        FROM RiskAssessments r WHERE r.GuestId = g.Id ORDER BY r.Version DESC
                    ) rk
                    """;
                predicates += "\n    AND ISNULL(rk.HasFlags, 0) = @HasRiskFlags";
            }
            if (lastActivityWithinDays.HasValue)
            {
                applies += "\nOUTER APPLY (SELECT TOP 1 c.OccurredAt FROM Contacts c WHERE c.GuestId = g.Id ORDER BY c.OccurredAt DESC) lc";
                predicates += "\n    AND lc.OccurredAt >= @LastContactAfter";
            }

            var countSql = $"""
                SELECT COUNT(*)
                FROM Guests g{applies}
                WHERE g.HubId = @HubId AND g.IsDeleted = 0
                    AND (@Status IS NULL OR g.Status = @Status)
                    AND (@SearchPattern IS NULL OR g.FirstName LIKE @SearchPattern OR g.LastName LIKE @SearchPattern)
                    AND (@AssignedCmhwId IS NULL OR g.AssignedCmhwId = @AssignedCmhwId){predicates}
                """;
            totalCount = await connection.ExecuteScalarAsync<int>(countSql, new
            {
                HubId = hubId,
                Status = status?.ToString(),
                SearchPattern = string.IsNullOrWhiteSpace(searchText) ? null : $"%{searchText}%",
                Pathway = pathway?.ToString(),
                HasRiskFlags = hasRiskFlags,
                AssignedCmhwId = assignedCmhwId,
                LastContactAfter = lastActivityWithinDays.HasValue
                    ? (DateTimeOffset?)DateTimeOffset.UtcNow.AddDays(-lastActivityWithinDays.Value)
                    : null,
            });
        }

        return new KeysetPage<GuestListItemDto>
        {
            Items = page.Select(r => new GuestListItemDto(
                r.Id, r.GuestNumber, r.FirstName, r.LastName, DateOnly.FromDateTime(r.DateOfBirth),
                Enum.Parse<GuestStatus>(r.Status), r.AssignedCmhwName, r.RegisteredAt, r.LastContactAt,
                r.PathwayCategory, r.HasRiskFlags,
                r.NextContactDue.HasValue ? DateOnly.FromDateTime(r.NextContactDue.Value) : null)).ToList(),
            NextCursor = nextCursor,
            HasMore = hasMore,
            TotalCount = totalCount,
        };
    }

    public async Task<GuestOverviewDto?> GetOverviewAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var guest = await db.Guests.AsNoTracking()
            .Where(g => g.Id == guestId)
            .Select(g => new
            {
                g.Id, g.GuestNumber, g.FirstName, g.LastName, g.DateOfBirth, g.Status, g.ContactPhone, g.ContactEmail, g.RegisteredAt,
                g.Pathway, g.AfaSupportNeeded, g.ReferralSource,
                AssignedCmhwName = db.Users.Where(s => s.Id == g.AssignedCmhwId).Select(s => s.DisplayName).FirstOrDefault(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (guest is null) return null;

        var hasRiskFlags = await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guestId)
            .OrderByDescending(r => r.Version)
            .Select(r => r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern)
            .FirstOrDefaultAsync(cancellationToken);

        var openFollowUps = await db.FollowUps.AsNoTracking()
            .CountAsync(f => f.GuestId == guestId && f.Status == FollowUpStatus.Scheduled, cancellationToken);

        var pinnedNotes = await db.Notes.AsNoTracking()
            .Where(n => n.GuestId == guestId && n.IsPinned)
            .OrderByDescending(n => n.CreatedAt)
            .Take(10)
            .Select(n => new GuestNoteDto(n.Id, n.Body, n.Color.ToString(), n.IsPinned,
                db.Users.Where(s => s.Id == n.AuthorStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown", n.CreatedAt))
            .ToListAsync(cancellationToken);

        var recentContacts = await db.Contacts.AsNoTracking()
            .Where(c => c.GuestId == guestId)
            .OrderByDescending(c => c.OccurredAt)
            .Take(10)
            .Select(c => new GuestContactSummaryDto(c.Id, c.Type.ToString(), c.Outcome.ToString(), c.OccurredAt,
                db.Users.Where(s => s.Id == c.CreatedByStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown"))
            .ToListAsync(cancellationToken);

        return new GuestOverviewDto(
            guest.Id, guest.GuestNumber, guest.FirstName, guest.LastName, guest.DateOfBirth, guest.Status,
            guest.ContactPhone, guest.ContactEmail, guest.AssignedCmhwName, guest.RegisteredAt,
            hasRiskFlags, openFollowUps, guest.Pathway, guest.AfaSupportNeeded, guest.ReferralSource, pinnedNotes, recentContacts);
    }

    public async Task<GuestDemographicsDto?> GetDemographicsAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var dto = await db.GuestDemographics.AsNoTracking()
            .Where(d => d.GuestId == guestId)
            .Select(d => new GuestDemographicsDto(
                d.GuestId, d.Ethnicity, d.Nationality, d.PreferredLanguage, d.InterpreterNeeded,
                d.HousingStatus, d.EmploymentStatus, d.EmergencyContactName, d.EmergencyContactPhone,
                d.EmergencyContactRelationship, d.GpName, d.GpPractice, d.NhsNumber))
            .FirstOrDefaultAsync(cancellationToken);
        if (dto is not null) return dto;

        // The demographics row is created lazily on first save, so a guest without one is
        // "nothing recorded yet", not 404 — mirror GetClinicalAsync's exists check.
        var exists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        return exists
            ? new GuestDemographicsDto(guestId, null, null, null, false, null, null, null, null, null, null, null, null)
            : null;
    }

    public async Task<GuestClinicalDto?> GetClinicalAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var exists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        if (!exists) return null;

        var history = await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guestId)
            .OrderByDescending(r => r.Version)
            .Select(r => new RiskAssessmentDto(
                r.Id, r.Version, r.SuicidalIdeation, r.SelfHarm, r.RiskToOthers, r.SevereDeterioration, r.SafeguardingConcern,
                r.Notes, db.Users.Where(s => s.Id == r.AssessedByStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown",
                r.AssessedAt))
            .ToListAsync(cancellationToken);

        return new GuestClinicalDto(guestId, history);
    }

    public async Task<GuestPathwayDto?> GetPathwayAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var guest = await db.Guests.AsNoTracking()
            .Where(g => g.Id == guestId)
            .Select(g => new { g.Pathway, g.AfaSupportNeeded })
            .FirstOrDefaultAsync(cancellationToken);
        if (guest is null) return null;

        var changes = await db.PathwayChanges.AsNoTracking()
            .Where(c => c.GuestId == guestId)
            .OrderByDescending(c => c.ChangedOn).ThenByDescending(c => c.CreatedAt)
            .Select(c => new PathwayChangeDto(
                c.Id, c.FromPathway, c.ToPathway, c.Reason,
                // An explicit "assigned by" name wins; otherwise resolve the staff member.
                c.AssignedByName ?? db.Users.Where(u => u.Id == c.AssignedByStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                c.ChangedOn,
                db.Users.Where(u => u.Id == c.RecordedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "System",
                c.CreatedAt))
            .ToListAsync(cancellationToken);

        var referrals = await db.PathwayReferrals.AsNoTracking()
            .Where(p => p.GuestId == guestId)
            .OrderByDescending(p => p.ReferredAt)
            .Select(p => new PathwayReferralDto(
                p.Id, p.Category.ToString(), p.Detail, p.Status.ToString(),
                db.Users.Where(s => s.Id == p.ReferredByStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown", p.ReferredAt))
            .ToListAsync(cancellationToken);

        return new GuestPathwayDto(guestId, guest.Pathway, guest.AfaSupportNeeded, changes, referrals);
    }

    public async Task<IReadOnlyList<CaseworkNoteDto>> GetCaseworkNotesAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var notes = await db.CaseworkNotes.AsNoTracking()
            .Where(n => n.GuestId == guestId)
            .OrderByDescending(n => n.OccurredAt).ThenByDescending(n => n.CreatedAt)
            .Select(n => new
            {
                n.Id, n.GuestId, n.Category, n.Status, n.ContactMethod, n.OccurredAt,
                n.Situation, n.Background, n.Assessment, n.Recommendation, n.RiskLevel,
                n.GuestReportedChanges, n.ServiceInvolvementChanges, n.AdditionalNotes,
                n.NextContactDate, n.MdtDiscussionRequested, n.CpnReferralRequested,
                AuthorName = db.Users.Where(u => u.Id == n.AuthorStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                n.CreatedAt, n.SubmittedAt,
            })
            .ToListAsync(cancellationToken);

        if (notes.Count == 0) return [];

        // Actions created from a note share the guest and were raised in the same moment; match
        // them by the day the note was submitted so the note shows what it produced.
        var actions = await db.GuestActions.AsNoTracking()
            .Where(a => a.GuestId == guestId)
            .Select(a => new
            {
                a.Id, a.Description, a.DueDate, a.IsCompleted, a.CreatedAt,
                AssignedToName = db.Users.Where(u => u.Id == a.AssignedToStaffId).Select(u => u.DisplayName).FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        return notes
            .Select(n => new CaseworkNoteDto(
                n.Id, n.GuestId, n.Category, n.Status, n.ContactMethod, n.OccurredAt,
                n.Situation, n.Background, n.Assessment, n.Recommendation, n.RiskLevel,
                n.GuestReportedChanges, n.ServiceInvolvementChanges, n.AdditionalNotes,
                n.NextContactDate, n.MdtDiscussionRequested, n.CpnReferralRequested,
                n.AuthorName, n.CreatedAt, n.SubmittedAt,
                n.SubmittedAt is null
                    ? []
                    : actions
                        .Where(a => Math.Abs((a.CreatedAt - n.SubmittedAt.Value).TotalMinutes) < 5)
                        .Select(a => new CaseworkNoteActionDto(a.Id, a.Description, a.DueDate, a.IsCompleted, a.AssignedToName))
                        .ToList()))
            .ToList();
    }

    public async Task<IReadOnlyList<GuestNoteDto>> GetNotesAsync(Guid guestId, CancellationToken cancellationToken = default) =>
        await db.Notes.AsNoTracking()
            .Where(n => n.GuestId == guestId)
            .OrderByDescending(n => n.IsPinned).ThenByDescending(n => n.CreatedAt)
            .Select(n => new GuestNoteDto(
                n.Id, n.Body, n.Color.ToString(), n.IsPinned,
                db.Users.Where(u => u.Id == n.AuthorStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                n.CreatedAt))
            .ToListAsync(cancellationToken);

    public async Task<GuestFollowUpsDto?> GetFollowUpsAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var exists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        if (!exists) return null;

        var followUps = await db.FollowUps.AsNoTracking()
            .Where(f => f.GuestId == guestId)
            .OrderByDescending(f => f.DueDate)
            .Select(f => new FollowUpItemDto(
                f.Id, f.DueDate, f.Status.ToString(),
                db.Users.Where(s => s.Id == f.AssigneeStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown",
                f.Notes, f.CompletedAt))
            .ToListAsync(cancellationToken);

        return new GuestFollowUpsDto(guestId, followUps);
    }

    public async Task<GuestInitialConversationDto?> GetInitialConversationAsync(Guid guestId, CancellationToken cancellationToken = default) =>
        await db.InitialConversationRecords.AsNoTracking()
            .Where(r => r.GuestId == guestId)
            .Select(r => new GuestInitialConversationDto(
                r.GuestId, r.PresentingIssues, r.Notes, r.ConsentConfirmed,
                db.Users.Where(s => s.Id == r.ConductedByStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown", r.ConductedAt))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<CmhwOptionDto>> GetHubCmhwsAsync(Guid hubId, CancellationToken cancellationToken = default) =>
        await db.Users.AsNoTracking()
            .Where(u => u.HubId == hubId && u.IsActive)
            .OrderBy(u => u.DisplayName)
            .Select(u => new CmhwOptionDto(u.Id, u.DisplayName))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<GuestSuggestionDto>> SuggestAsync(Guid hubId, string query, int limit, CancellationToken cancellationToken = default)
    {
        var trimmed = query.Trim();
        if (trimmed.Length < 2) return [];

        // "G-1001" / plain-number queries match the guest reference; anything else matches names.
        var numericPart = trimmed.StartsWith("G-", StringComparison.OrdinalIgnoreCase) ? trimmed[2..] : trimmed;
        int? guestNumber = int.TryParse(numericPart, out var n) ? n : null;

        var guests = db.Guests.AsNoTracking().Where(g => g.HubId == hubId);
        guests = guestNumber is not null
            ? guests.Where(g => g.GuestNumber == guestNumber)
            : guests.Where(g =>
                g.FirstName.StartsWith(trimmed) || g.LastName.StartsWith(trimmed)
                || (g.FirstName + " " + g.LastName).StartsWith(trimmed));

        return await guests
            .OrderBy(g => g.LastName).ThenBy(g => g.FirstName)
            .Take(Math.Clamp(limit, 1, 20))
            .Select(g => new GuestSuggestionDto(g.Id, g.GuestNumber, g.FirstName + " " + g.LastName, g.Status))
            .ToListAsync(cancellationToken);
    }

    public async Task<GuestDialogDto?> GetDialogAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var guestExists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        if (!guestExists) return null;

        var history = await db.DialogAssessments.AsNoTracking()
            .Where(d => d.GuestId == guestId)
            .OrderBy(d => d.Version)
            .Select(d => new DialogAssessmentDto(
                d.Id, d.Version, d.AssessedAt,
                db.Users.Where(u => u.Id == d.AssessedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "System",
                d.MentalHealth, d.PhysicalHealth, d.JobSituation, d.Accommodation,
                d.LeisureActivities, d.FriendshipsSocialLife, d.RelationshipWithFamily,
                d.PersonalSafety, d.PracticalHelp, d.Medication, d.MeetingsWithMhStaff,
                d.MentalHealth + d.PhysicalHealth + d.JobSituation + d.Accommodation +
                d.LeisureActivities + d.FriendshipsSocialLife + d.RelationshipWithFamily +
                d.PersonalSafety + d.PracticalHelp + d.Medication + d.MeetingsWithMhStaff))
            .ToListAsync(cancellationToken);

        return new GuestDialogDto(history.FirstOrDefault(), history.LastOrDefault(), history);
    }

    public async Task<IReadOnlyList<GuestActionDto>> GetActionsAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return await db.GuestActions.AsNoTracking()
            .Where(a => a.GuestId == guestId)
            .OrderBy(a => a.IsCompleted).ThenBy(a => a.DueDate)
            .Select(a => new GuestActionDto(
                a.Id, a.Description, a.DueDate,
                a.AssignedToStaffId,
                db.Users.Where(u => u.Id == a.AssignedToStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                a.IsCompleted, !a.IsCompleted && a.DueDate < today, a.CreatedAt, a.CompletedAt))
            .ToListAsync(cancellationToken);
    }

    private sealed class GuestListRow
    {
        public Guid Id { get; set; }
        public int GuestNumber { get; set; }
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public DateTime DateOfBirth { get; set; }
        public string Status { get; set; } = default!;
        public string? AssignedCmhwName { get; set; }
        public DateTimeOffset RegisteredAt { get; set; }
        public DateTimeOffset? LastContactAt { get; set; }
        public string? PathwayCategory { get; set; }
        public bool HasRiskFlags { get; set; }
        public DateTime? NextContactDue { get; set; }
    }
}
