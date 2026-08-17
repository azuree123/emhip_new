using Dapper;
using Emhip.Application.Common;
using Emhip.Application.Guests;
using Emhip.Application.Guests.Dtos;
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
        Guid hubId, string? searchText, GuestStatus? status, string? cursor, int pageSize, CancellationToken cancellationToken = default)
    {
        var decodedCursor = KeysetCursor.Decode<GuestCursor>(cursor);

        const string sql = """
            SELECT TOP (@FetchSize)
                g.Id, g.FirstName, g.LastName, g.DateOfBirth, g.Status,
                s.DisplayName AS AssignedCmhwName, g.RegisteredAt, lc.OccurredAt AS LastContactAt
            FROM Guests g
            LEFT JOIN AspNetUsers s ON s.Id = g.AssignedCmhwId
            OUTER APPLY (
                SELECT TOP 1 c.OccurredAt FROM Contacts c WHERE c.GuestId = g.Id ORDER BY c.OccurredAt DESC
            ) lc
            WHERE g.HubId = @HubId AND g.IsDeleted = 0
                AND (@Status IS NULL OR g.Status = @Status)
                AND (@SearchPattern IS NULL OR g.FirstName LIKE @SearchPattern OR g.LastName LIKE @SearchPattern)
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

        return new KeysetPage<GuestListItemDto>
        {
            Items = page.Select(r => new GuestListItemDto(
                r.Id, r.FirstName, r.LastName, DateOnly.FromDateTime(r.DateOfBirth),
                Enum.Parse<GuestStatus>(r.Status), r.AssignedCmhwName, r.RegisteredAt, r.LastContactAt)).ToList(),
            NextCursor = nextCursor,
            HasMore = hasMore,
        };
    }

    public async Task<GuestOverviewDto?> GetOverviewAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var guest = await db.Guests.AsNoTracking()
            .Where(g => g.Id == guestId)
            .Select(g => new
            {
                g.Id, g.FirstName, g.LastName, g.DateOfBirth, g.Status, g.ContactPhone, g.ContactEmail, g.RegisteredAt,
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
            guest.Id, guest.FirstName, guest.LastName, guest.DateOfBirth, guest.Status,
            guest.ContactPhone, guest.ContactEmail, guest.AssignedCmhwName, guest.RegisteredAt,
            hasRiskFlags, openFollowUps, pinnedNotes, recentContacts);
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
        var exists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        if (!exists) return null;

        var referrals = await db.PathwayReferrals.AsNoTracking()
            .Where(p => p.GuestId == guestId)
            .OrderByDescending(p => p.ReferredAt)
            .Select(p => new PathwayReferralDto(
                p.Id, p.Category.ToString(), p.Detail, p.Status.ToString(),
                db.Users.Where(s => s.Id == p.ReferredByStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown", p.ReferredAt))
            .ToListAsync(cancellationToken);

        return new GuestPathwayDto(guestId, referrals);
    }

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

    private sealed class GuestListRow
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public DateTime DateOfBirth { get; set; }
        public string Status { get; set; } = default!;
        public string? AssignedCmhwName { get; set; }
        public DateTimeOffset RegisteredAt { get; set; }
        public DateTimeOffset? LastContactAt { get; set; }
    }
}
