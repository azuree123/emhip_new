using Dapper;
using Emhip.Application.Common;
using Emhip.Application.Guests;
using Emhip.Application.Guests.Actions;
using Emhip.Application.Guests.CarePlans;
using Emhip.Application.Guests.Caseload;
using Emhip.Application.Guests.Casework;
using Emhip.Application.Guests.Cpn;
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
public sealed class GuestReadService(ISqlConnectionFactory connectionFactory, EmhipDbContext db, Emhip.Application.Abstractions.IAppSettingsService settings) : IGuestReadService
{
    private sealed record GuestCursor(string LastName, string FirstName, Guid Id);

    /// <summary>
    /// The guest-list "segments" the dashboards and reports link through to — each one the exact
    /// predicate behind a tile's count (Clinical complexity, CPN involvement, Data quality), so
    /// the list a count opens holds the guests behind that number. Keys come from GuestSegments;
    /// only these fixed snippets are ever spliced into the SQL, never caller text.
    /// </summary>
    private static readonly Dictionary<string, string> SegmentPredicates = new(StringComparer.OrdinalIgnoreCase)
    {
        [GuestSegments.Smi] = "EXISTS (SELECT 1 FROM GuestClinicalProfiles cp WHERE cp.GuestId = g.Id AND cp.SmiIndicator = 1)",
        [GuestSegments.OnMedication] = "EXISTS (SELECT 1 FROM GuestClinicalProfiles cp WHERE cp.GuestId = g.Id AND cp.CurrentMedications IS NOT NULL AND cp.CurrentMedications <> '')",
        [GuestSegments.TrustInvolvement] = "EXISTS (SELECT 1 FROM GuestClinicalProfiles cp WHERE cp.GuestId = g.Id AND cp.TrustInvolvement = 1)",
        [GuestSegments.CpnInvolved] = "EXISTS (SELECT 1 FROM GuestClinicalProfiles cp WHERE cp.GuestId = g.Id AND cp.CpnInvolved = 1)",
        [GuestSegments.CpnAssessment] = "EXISTS (SELECT 1 FROM CpnInitialAssessments a WHERE a.GuestId = g.Id AND a.Status = 'Submitted')",
        [GuestSegments.CpnSessions30] = "EXISTS (SELECT 1 FROM CaseworkNotes n WHERE n.GuestId = g.Id AND n.IsCpnContact = 1 AND n.Status = 'Submitted' AND n.OccurredAt >= @Since30)",
        [GuestSegments.CpnReferrals30] = "EXISTS (SELECT 1 FROM CaseworkNotes n WHERE n.GuestId = g.Id AND n.CpnReferralRequested = 1 AND n.Status = 'Submitted' AND n.SubmittedAt >= @Since30)",
        // The dashboard's CPN involvement table: profile flag, a submitted Part 1, or a CPN contact.
        [GuestSegments.CpnAny] =
            "EXISTS (SELECT 1 FROM GuestClinicalProfiles cp WHERE cp.GuestId = g.Id AND cp.CpnInvolved = 1)"
            + " OR EXISTS (SELECT 1 FROM CpnInitialAssessments a WHERE a.GuestId = g.Id AND a.Status = 'Submitted')"
            + " OR EXISTS (SELECT 1 FROM CaseworkNotes n WHERE n.GuestId = g.Id AND n.IsCpnContact = 1 AND n.Status = 'Submitted')",
        [GuestSegments.MissingPathway] = "g.Pathway IS NULL",
        [GuestSegments.MissingInitialConversation] = "NOT EXISTS (SELECT 1 FROM InitialConversationRecords r WHERE r.GuestId = g.Id)",
        [GuestSegments.MissingDialogBaseline] = "NOT EXISTS (SELECT 1 FROM DialogAssessments d WHERE d.GuestId = g.Id)",
        [GuestSegments.MissingDemographics] = "NOT EXISTS (SELECT 1 FROM GuestDemographics dm WHERE dm.GuestId = g.Id)",
        [GuestSegments.MissingCmhw] = "g.AssignedCmhwId IS NULL",
        [GuestSegments.MissingReferralSource] = "g.ReferralSource IS NULL",
        [GuestSegments.NoRecentContact] = "g.Status = 'Active' AND NOT EXISTS (SELECT 1 FROM Contacts c WHERE c.GuestId = g.Id AND c.OccurredAt >= @Since90)",
        [GuestSegments.AutoInactive] = "g.Status = 'OnHold'",
        [GuestSegments.PastRetention] = "ISNULL(g.LastActivityAt, g.RegisteredAt) < @RetentionCutoff",
        // Reports screen KPIs — each mirrors the ReportReadService count it drills into, measured
        // over @PeriodStart..@PeriodEnd (the reporting period; all time when none is passed).
        [GuestSegments.AfaSupport] = "g.AfaSupportNeeded = 1",
        [GuestSegments.ContactInPeriod] = "EXISTS (SELECT 1 FROM Contacts c WHERE c.GuestId = g.Id AND c.OccurredAt >= @PeriodStart AND c.OccurredAt <= @PeriodEnd)",
        [GuestSegments.DialogBaselineInPeriod] = DialogBaselineInPeriod,
        [GuestSegments.DialogReassessedInPeriod] = DialogReassessedInPeriod,
        [GuestSegments.DialogAwaitingReassessment] = $"{DialogBaselineInPeriod} AND NOT {DialogReassessedInPeriod}",
        [GuestSegments.CpnSeenInPeriod] = "EXISTS (SELECT 1 FROM CaseworkNotes n WHERE n.GuestId = g.Id AND n.IsCpnContact = 1 AND n.Status = 'Submitted' AND n.OccurredAt >= @PeriodStart AND n.OccurredAt <= @PeriodEnd)",
        // The CPN caseload: the clinical profile's CPN flag, or a confirmed CPN referral.
        [GuestSegments.CpnCaseload] =
            "EXISTS (SELECT 1 FROM GuestClinicalProfiles cp WHERE cp.GuestId = g.Id AND cp.CpnInvolved = 1)"
            + " OR EXISTS (SELECT 1 FROM MdtQueueItems i WHERE i.GuestId = g.Id AND i.Kind = 'CpnReferral' AND i.Status = 'Confirmed')",
        [GuestSegments.CpnReferredInPeriod] = CpnReferralInPeriod(null),
        [GuestSegments.CpnConfirmedInPeriod] = CpnReferralInPeriod("Confirmed"),
        [GuestSegments.CpnDeclinedInPeriod] = CpnReferralInPeriod("Declined"),
        [GuestSegments.CpnPendingInPeriod] = CpnReferralInPeriod("Pending"),
    };

    private const string DialogBaselineInPeriod =
        "EXISTS (SELECT 1 FROM DialogAssessments d WHERE d.GuestId = g.Id AND d.Version = 1 AND d.AssessedAt >= @PeriodStart AND d.AssessedAt <= @PeriodEnd)";

    private const string DialogReassessedInPeriod =
        "EXISTS (SELECT 1 FROM DialogAssessments d WHERE d.GuestId = g.Id AND d.Version > 1 AND d.AssessedAt >= @PeriodStart AND d.AssessedAt <= @PeriodEnd)";

    /// <summary>A CPN referral requested in the period, optionally still in <paramref name="status"/>.</summary>
    private static string CpnReferralInPeriod(string? status) =>
        "EXISTS (SELECT 1 FROM MdtQueueItems i WHERE i.GuestId = g.Id AND i.Kind = 'CpnReferral'"
        + (status is null ? string.Empty : $" AND i.Status = '{status}'")
        + " AND i.RequestedAt >= @PeriodStart AND i.RequestedAt <= @PeriodEnd)";

    public async Task<KeysetPage<GuestListItemDto>> GetGuestListAsync(
        Guid hubId, string? searchText, GuestStatus? status, string? cursor, int pageSize,
        PathwayCategory? pathway = null, bool? hasRiskFlags = null, Guid? assignedCmhwId = null,
        int? lastActivityWithinDays = null, bool? urgentOnly = null,
        string? ethnicity = null, string? gender = null, string? countryOfOrigin = null,
        int? ageMin = null, int? ageMax = null, string? segment = null, GuestPathway? clinicalPathway = null,
        DateOnly? registeredFrom = null, DateOnly? registeredTo = null,
        DateOnly? periodFrom = null, DateOnly? periodTo = null, string? referralSource = null,
        CancellationToken cancellationToken = default)
    {
        var decodedCursor = KeysetCursor.Decode<GuestCursor>(cursor);

        // An unknown segment key matches nothing rather than silently widening the list.
        var segmentPredicate = segment is null
            ? string.Empty
            : "\n    AND " + (SegmentPredicates.TryGetValue(segment, out var predicate) ? $"({predicate})" : "1 = 0");
        var retentionYears = string.Equals(segment, GuestSegments.PastRetention, StringComparison.OrdinalIgnoreCase)
            ? await settings.GetIntAsync(Emhip.Application.Settings.SettingsCatalog.Keys.RecordRetentionYears, 20, cancellationToken)
            : 0;
        // The search box offers name, ID, phone and CMHW — "G-1001" / "1001" matches the guest number.
        var numberMatch = searchText is null ? null : System.Text.RegularExpressions.Regex.Match(searchText, @"^\s*(?:[Gg]-?)?(\d{1,9})\s*$");
        int? searchNumber = numberMatch is { Success: true } ? int.Parse(numberMatch.Groups[1].Value) : null;
        var clinicalPathwayName = clinicalPathway?.ToString();
        var since30 = DateTimeOffset.UtcNow.AddDays(-30);
        var since90 = DateTimeOffset.UtcNow.AddDays(-90);
        var retentionCutoff = DateTimeOffset.UtcNow.AddYears(-Math.Max(retentionYears, 1));
        // The Reports screen's period: whole UTC days, inclusive — the same window the reports count.
        DateTimeOffset? registeredAfter = registeredFrom is { } rf ? new DateTimeOffset(rf.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero) : null;
        DateTimeOffset? registeredBefore = registeredTo is { } rt ? new DateTimeOffset(rt.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero) : null;
        // The window the "…InPeriod" report segments are measured over; all time when not given.
        var periodStart = periodFrom is { } pf ? new DateTimeOffset(pf.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero) : DateTimeOffset.MinValue;
        var periodEnd = periodTo is { } pt ? new DateTimeOffset(pt.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero) : DateTimeOffset.MaxValue;

        var sql = $"""
            SELECT TOP (@FetchSize)
                g.Id, g.GuestNumber, g.FirstName, g.LastName, g.DateOfBirth, g.Status, g.IsUrgent, g.Pathway,
                s.DisplayName AS AssignedCmhwName, g.RegisteredAt, lc.OccurredAt AS LastContactAt,
                pw.Category AS PathwayCategory, ISNULL(rk.HasFlags, 0) AS HasRiskFlags, nf.DueDate AS NextContactDue
            FROM Guests g
            LEFT JOIN AspNetUsers s ON s.Id = g.AssignedCmhwId
            LEFT JOIN GuestDemographics gd ON gd.GuestId = g.Id
            OUTER APPLY (
                SELECT TOP 1 c.OccurredAt FROM Contacts c WHERE c.GuestId = g.Id ORDER BY c.OccurredAt DESC
            ) lc
            OUTER APPLY (
                SELECT TOP 1 p.Category FROM PathwayReferrals p WHERE p.GuestId = g.Id ORDER BY p.ReferredAt DESC
            ) pw
            OUTER APPLY (
                SELECT TOP 1 CAST(CASE WHEN r.SuicidalIdeation = 1 OR r.SelfHarm = 1 OR r.RiskToOthers = 1
                    OR r.SevereDeterioration = 1 OR r.SafeguardingConcern = 1 OR r.OtherRisk = 1 THEN 1 ELSE 0 END AS bit) AS HasFlags
                FROM RiskAssessments r WHERE r.GuestId = g.Id ORDER BY r.Version DESC
            ) rk
            OUTER APPLY (
                SELECT TOP 1 f.DueDate FROM FollowUps f
                WHERE f.GuestId = g.Id AND f.Status IN ('Scheduled', 'Overdue') ORDER BY f.DueDate
            ) nf
            WHERE g.HubId = @HubId AND g.IsDeleted = 0
                AND (@Status IS NULL OR g.Status = @Status)
                AND (@SearchPattern IS NULL OR g.FirstName LIKE @SearchPattern OR g.LastName LIKE @SearchPattern
                    OR (g.FirstName + ' ' + g.LastName) LIKE @SearchPattern OR g.GuestNumber = @SearchNumber
                    OR g.ContactPhone LIKE @SearchPattern
                    OR EXISTS (SELECT 1 FROM AspNetUsers su WHERE su.Id = g.AssignedCmhwId AND su.DisplayName LIKE @SearchPattern))
                AND (@Pathway IS NULL OR pw.Category = @Pathway)
                AND (@HasRiskFlags IS NULL OR ISNULL(rk.HasFlags, 0) = @HasRiskFlags)
                AND (@AssignedCmhwId IS NULL OR g.AssignedCmhwId = @AssignedCmhwId)
                AND (@UrgentOnly IS NULL OR g.IsUrgent = @UrgentOnly)
                AND (@Ethnicity IS NULL OR gd.Ethnicity = @Ethnicity)
                AND (@CountryOfOrigin IS NULL OR gd.CountryOfOrigin = @CountryOfOrigin)
                AND (@Gender IS NULL OR g.Gender = @Gender)
                -- Age is derived from the date of birth rather than stored, so the band filter
                -- compares against the birth-date window the band implies.
                AND (@BornOnOrBefore IS NULL OR g.DateOfBirth <= @BornOnOrBefore)
                AND (@BornOnOrAfter IS NULL OR g.DateOfBirth >= @BornOnOrAfter)
                AND (@LastContactAfter IS NULL OR lc.OccurredAt >= @LastContactAfter)
                AND (@RegisteredAfter IS NULL OR g.RegisteredAt >= @RegisteredAfter)
                AND (@RegisteredBefore IS NULL OR g.RegisteredAt <= @RegisteredBefore)
                AND (@ReferralSource IS NULL OR g.ReferralSource = @ReferralSource)
                AND (@ClinicalPathway IS NULL OR g.Pathway = @ClinicalPathway){segmentPredicate}
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
            SearchNumber = searchNumber,
            Pathway = pathway?.ToString(),
            HasRiskFlags = hasRiskFlags,
            AssignedCmhwId = assignedCmhwId,
            Ethnicity = ethnicity,
            CountryOfOrigin = countryOfOrigin,
            Gender = gender,
            // ageMin 35 => born on or before today-35y; ageMax 44 => born on or after today-45y+1d.
            // Passed as DateTime because Dapper has no DateOnly parameter mapping.
            BornOnOrBefore = ageMin.HasValue ? DateTime.UtcNow.Date.AddYears(-ageMin.Value) : (DateTime?)null,
            BornOnOrAfter = ageMax.HasValue ? DateTime.UtcNow.Date.AddYears(-(ageMax.Value + 1)).AddDays(1) : (DateTime?)null,
            UrgentOnly = urgentOnly,
            LastContactAfter = lastActivityWithinDays.HasValue
                ? (DateTimeOffset?)DateTimeOffset.UtcNow.AddDays(-lastActivityWithinDays.Value)
                : null,
            HasCursor = decodedCursor is not null,
            LastName = decodedCursor?.LastName ?? string.Empty,
            FirstName = decodedCursor?.FirstName ?? string.Empty,
            Id = decodedCursor?.Id ?? Guid.Empty,
            FetchSize = pageSize + 1,
            ClinicalPathway = clinicalPathwayName,
            RegisteredAfter = registeredAfter,
            RegisteredBefore = registeredBefore,
            ReferralSource = referralSource,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            Since30 = since30,
            Since90 = since90,
            RetentionCutoff = retentionCutoff,
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
                            OR r.SevereDeterioration = 1 OR r.SafeguardingConcern = 1 OR r.OtherRisk = 1 THEN 1 ELSE 0 END AS bit) AS HasFlags
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
            if (ethnicity is not null || countryOfOrigin is not null)
            {
                applies += "\nLEFT JOIN GuestDemographics gd ON gd.GuestId = g.Id";
                if (ethnicity is not null) predicates += "\n    AND gd.Ethnicity = @Ethnicity";
                if (countryOfOrigin is not null) predicates += "\n    AND gd.CountryOfOrigin = @CountryOfOrigin";
            }
            if (gender is not null) predicates += "\n    AND g.Gender = @Gender";
            if (ageMax is not null) predicates += "\n    AND g.DateOfBirth >= @BornOnOrAfter";
            if (ageMin is not null) predicates += "\n    AND g.DateOfBirth <= @BornOnOrBefore";

            var countSql = $"""
                SELECT COUNT(*)
                FROM Guests g{applies}
                WHERE g.HubId = @HubId AND g.IsDeleted = 0
                    AND (@Status IS NULL OR g.Status = @Status)
                    AND (@SearchPattern IS NULL OR g.FirstName LIKE @SearchPattern OR g.LastName LIKE @SearchPattern
                    OR (g.FirstName + ' ' + g.LastName) LIKE @SearchPattern OR g.GuestNumber = @SearchNumber
                    OR g.ContactPhone LIKE @SearchPattern
                    OR EXISTS (SELECT 1 FROM AspNetUsers su WHERE su.Id = g.AssignedCmhwId AND su.DisplayName LIKE @SearchPattern))
                    AND (@AssignedCmhwId IS NULL OR g.AssignedCmhwId = @AssignedCmhwId)
                    AND (@UrgentOnly IS NULL OR g.IsUrgent = @UrgentOnly)
                    AND (@RegisteredAfter IS NULL OR g.RegisteredAt >= @RegisteredAfter)
                    AND (@RegisteredBefore IS NULL OR g.RegisteredAt <= @RegisteredBefore)
                    AND (@ReferralSource IS NULL OR g.ReferralSource = @ReferralSource)
                    AND (@ClinicalPathway IS NULL OR g.Pathway = @ClinicalPathway){predicates}{segmentPredicate}
                """;
            totalCount = await connection.ExecuteScalarAsync<int>(countSql, new
            {
                HubId = hubId,
                Status = status?.ToString(),
                SearchPattern = string.IsNullOrWhiteSpace(searchText) ? null : $"%{searchText}%",
                SearchNumber = searchNumber,
                Pathway = pathway?.ToString(),
                HasRiskFlags = hasRiskFlags,
                AssignedCmhwId = assignedCmhwId,
                Ethnicity = ethnicity,
                CountryOfOrigin = countryOfOrigin,
                Gender = gender,
                // ageMin 35 => born on or before today-35y; ageMax 44 => born on or after today-45y+1d.
                // Passed as DateTime because Dapper has no DateOnly parameter mapping.
                BornOnOrBefore = ageMin.HasValue ? DateTime.UtcNow.Date.AddYears(-ageMin.Value) : (DateTime?)null,
                BornOnOrAfter = ageMax.HasValue ? DateTime.UtcNow.Date.AddYears(-(ageMax.Value + 1)).AddDays(1) : (DateTime?)null,
                UrgentOnly = urgentOnly,
                LastContactAfter = lastActivityWithinDays.HasValue
                    ? (DateTimeOffset?)DateTimeOffset.UtcNow.AddDays(-lastActivityWithinDays.Value)
                    : null,
                ClinicalPathway = clinicalPathwayName,
                RegisteredAfter = registeredAfter,
                RegisteredBefore = registeredBefore,
                ReferralSource = referralSource,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                Since30 = since30,
                Since90 = since90,
                RetentionCutoff = retentionCutoff,
            });
        }

        return new KeysetPage<GuestListItemDto>
        {
            Items = page.Select(r => new GuestListItemDto(
                r.Id, r.GuestNumber, r.FirstName, r.LastName, DateOnly.FromDateTime(r.DateOfBirth),
                Enum.Parse<GuestStatus>(r.Status), r.AssignedCmhwName, r.RegisteredAt, r.LastContactAt,
                r.PathwayCategory, r.HasRiskFlags, r.IsUrgent,
                r.NextContactDue.HasValue ? DateOnly.FromDateTime(r.NextContactDue.Value) : null,
                Enum.TryParse<GuestPathway>(r.Pathway, out var clinicalPathway) ? clinicalPathway : null)).ToList(),
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
                g.Id, g.GuestNumber, g.FirstName, g.LastName, g.DateOfBirth, g.Status, g.IsUrgent, g.ContactPhone, g.ContactEmail,
                g.AddressLine1, g.PostCode, g.RegisteredAt,
                g.Pathway, g.AfaSupportNeeded, g.ReferralSource,
                g.UrgentSince, g.LastActivityAt, g.ReferralType, g.ReferralSubcategory,
                AssignedCmhwName = db.Users.Where(s => s.Id == g.AssignedCmhwId).Select(s => s.DisplayName).FirstOrDefault(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (guest is null) return null;

        var hasRiskFlags = await db.RiskAssessments.AsNoTracking()
            .Where(r => r.GuestId == guestId)
            .OrderByDescending(r => r.Version)
            .Select(r => r.SuicidalIdeation || r.SelfHarm || r.RiskToOthers || r.SevereDeterioration || r.SafeguardingConcern || r.OtherRisk)
            .FirstOrDefaultAsync(cancellationToken);

        var openFollowUps = await db.FollowUps.AsNoTracking()
            .CountAsync(f => f.GuestId == guestId && (f.Status == FollowUpStatus.Scheduled || f.Status == FollowUpStatus.Overdue), cancellationToken);

        var pinnedNotes = await db.Notes.AsNoTracking()
            .Where(n => n.GuestId == guestId && n.IsPinned)
            .OrderByDescending(n => n.CreatedAt)
            .Take(10)
            .Select(n => new GuestNoteDto(n.Id, n.Body, n.Color.ToString(), n.IsPinned,
                db.Users.Where(s => s.Id == n.AuthorStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown", n.CreatedAt))
            .ToListAsync(cancellationToken);

        var recentContacts = (await db.Contacts.AsNoTracking()
            .Where(c => c.GuestId == guestId)
            .OrderByDescending(c => c.OccurredAt)
            .Take(10)
            .Select(c => new
            {
                c.Id, c.Type, c.Outcome, c.OccurredAt,
                CreatedByName = db.Users.Where(s => s.Id == c.CreatedByStaffId).Select(s => s.DisplayName).FirstOrDefault() ?? "Unknown",
                Category = db.CaseworkNotes.Where(n => n.ContactId == c.Id).Select(n => n.Category).FirstOrDefault(),
                IsCpnContact = db.CaseworkNotes.Any(n => n.ContactId == c.Id && n.IsCpnContact),
            })
            .ToListAsync(cancellationToken))
            .Select(c => new GuestContactSummaryDto(
                c.Id, c.Type.ToString(), c.Outcome.ToString(), c.OccurredAt, c.CreatedByName, c.Category?.ToString(), c.IsCpnContact))
            .ToList();

        return new GuestOverviewDto(
            guest.Id, guest.GuestNumber, guest.FirstName, guest.LastName, guest.DateOfBirth, guest.Status,
            guest.ContactPhone, guest.ContactEmail, guest.AddressLine1, guest.PostCode, guest.AssignedCmhwName, guest.RegisteredAt,
            hasRiskFlags, openFollowUps, guest.Pathway, guest.AfaSupportNeeded, guest.ReferralSource, pinnedNotes, recentContacts,
            guest.IsUrgent, guest.UrgentSince, guest.LastActivityAt, guest.ReferralType, guest.ReferralSubcategory);
    }

    public async Task<GuestDemographicsDto?> GetDemographicsAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var dto = await db.GuestDemographics.AsNoTracking()
            .Where(d => d.GuestId == guestId)
            .Select(d => new GuestDemographicsDto(
                d.GuestId, d.Ethnicity, d.Nationality, d.PreferredLanguage, d.InterpreterNeeded,
                d.HousingStatus, d.EmploymentStatus, d.MaritalStatus, d.LivingGroup, d.CountryOfOrigin,
                d.EmergencyContactName, d.EmergencyContactPhone,
                d.EmergencyContactRelationship, d.GpName, d.GpPractice, d.NhsNumber))
            .FirstOrDefaultAsync(cancellationToken);
        if (dto is not null) return dto;

        // The demographics row is created lazily on first save, so a guest without one is
        // "nothing recorded yet", not 404 — mirror GetClinicalAsync's exists check.
        var exists = await db.Guests.AsNoTracking().AnyAsync(g => g.Id == guestId, cancellationToken);
        return exists
            ? new GuestDemographicsDto(guestId, null, null, null, false, null, null, null, null, null, null, null, null, null, null, null)
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
                r.AssessedAt, r.OtherRisk, r.OtherRiskDetails))
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
                n.RiskNotes, n.IsCpnContact, n.CpnSessionType, n.SessionNumber,
                n.GuestReportedChanges, n.ServiceInvolvementChanges, n.AdditionalNotes,
                n.NextContactDate, n.NoNextContactRequired, n.MdtDiscussionRequested, n.CpnReferralRequested,
                n.ActivityType, n.Occasion, n.AdviceType,
                AuthorName = db.Users.Where(u => u.Id == n.AuthorStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                n.CreatedAt, n.SubmittedAt,
            })
            .ToListAsync(cancellationToken);

        if (notes.Count == 0) return [];

        var noteIds = notes.Select(n => n.Id).ToList();
        var attachments = await db.Documents.AsNoTracking()
            .Where(d => d.CaseworkNoteId != null && noteIds.Contains(d.CaseworkNoteId.Value) && !d.IsDeleted)
            .OrderBy(d => d.CreatedAt)
            .Select(d => new
            {
                NoteId = d.CaseworkNoteId!.Value,
                Dto = new CaseworkNoteAttachmentDto(
                    d.Id,
                    db.DocumentVersions.Where(v => v.DocumentId == d.Id && v.VersionNumber == d.CurrentVersionNumber).Select(v => v.FileName).FirstOrDefault() ?? d.Title,
                    db.DocumentVersions.Where(v => v.DocumentId == d.Id && v.VersionNumber == d.CurrentVersionNumber).Select(v => v.ContentType).FirstOrDefault() ?? "application/octet-stream",
                    db.DocumentVersions.Where(v => v.DocumentId == d.Id && v.VersionNumber == d.CurrentVersionNumber).Select(v => v.SizeBytes).FirstOrDefault(),
                    d.CreatedAt,
                    db.Users.Where(u => u.Id == d.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown"),
            })
            .ToListAsync(cancellationToken);
        var attachmentsByNote = attachments.GroupBy(a => a.NoteId).ToDictionary(g => g.Key, g => (IReadOnlyList<CaseworkNoteAttachmentDto>)g.Select(a => a.Dto).ToList());

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
                n.RiskNotes, n.IsCpnContact, n.CpnSessionType, n.SessionNumber,
                n.GuestReportedChanges, n.ServiceInvolvementChanges, n.AdditionalNotes,
                n.NextContactDate, n.NoNextContactRequired, n.MdtDiscussionRequested, n.CpnReferralRequested,
                n.ActivityType, n.Occasion, n.AdviceType,
                n.AuthorName, n.CreatedAt, n.SubmittedAt,
                n.SubmittedAt is null
                    ? []
                    : actions
                        .Where(a => Math.Abs((a.CreatedAt - n.SubmittedAt.Value).TotalMinutes) < 5)
                        .Select(a => new CaseworkNoteActionDto(a.Id, a.Description, a.DueDate, a.IsCompleted, a.AssignedToName))
                        .ToList(),
                attachmentsByNote.TryGetValue(n.Id, out var files) ? files : []))
            .ToList();
    }

    public async Task<GuestCarePlansDto> GetCarePlansAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var plans = await db.CarePlans.AsNoTracking()
            .Where(p => p.GuestId == guestId)
            .OrderByDescending(p => p.StartedOn).ThenByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id, p.GuestId, p.Status, p.GuestVoice, p.SupportArrangements, p.BetweenSessions, p.Referrals, p.OtherNotes,
                p.NextContactOn, p.CpnInvolvementRequired, p.NhsReferral,
                p.StartedOn, p.ReviewDueOn, p.ClosedOn, p.CreatedAt, p.UpdatedAt,
                CreatedByName = db.Users.Where(u => u.Id == p.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
            })
            .ToListAsync(cancellationToken);

        if (plans.Count == 0) return new GuestCarePlansDto(null, []);

        var planIds = plans.Select(p => p.Id).ToList();
        var goals = await db.CarePlanGoals.AsNoTracking()
            .Where(g => planIds.Contains(g.CarePlanId))
            .OrderBy(g => g.SortOrder)
            .Select(g => new { g.CarePlanId, Dto = new CarePlanGoalDto(g.Id, g.Description, g.Status, g.TargetDate, g.ProgressNote, g.SortOrder) })
            .ToListAsync(cancellationToken);

        var mapped = plans
            .Select(p => new CarePlanDto(
                p.Id, p.GuestId, p.Status, p.GuestVoice, p.SupportArrangements, p.BetweenSessions, p.Referrals, p.OtherNotes,
                p.NextContactOn, p.CpnInvolvementRequired, p.NhsReferral,
                p.StartedOn, p.ReviewDueOn, p.ClosedOn,
                p.Status == CarePlanStatus.Active && p.ReviewDueOn is not null && p.ReviewDueOn < today,
                p.CreatedByName, p.CreatedAt, p.UpdatedAt,
                goals.Where(g => g.CarePlanId == p.Id).Select(g => g.Dto).ToList()))
            .ToList();
        var current = mapped.FirstOrDefault(p => p.Status == CarePlanStatus.Active);

        return new GuestCarePlansDto(current, mapped.Where(p => p.Status != CarePlanStatus.Active).ToList());
    }

    public async Task<GuestCpnAssessmentDto> GetCpnAssessmentAsync(Guid guestId, CancellationToken cancellationToken = default)
    {
        var assessment = await db.CpnInitialAssessments.AsNoTracking()
            .Where(a => a.GuestId == guestId)
            .Select(a => new
            {
                a.Id, a.GuestId, a.Status, a.ContactMethod, a.OccurredAt,
                a.MethodOfAssessment, a.OthersPresent,
                a.ReasonForReferral, a.ReferredBy, a.CurrentDiagnosis, a.DiagnosisDetail, a.CurrentMedication,
                a.PreviousPresentations, a.PreviousInpatientAdmission, a.PreviousMhaSection, a.TalkingTherapies,
                a.PersonalHistory, a.FamilyMentalIllness,
                a.AppearanceAndBehaviour, a.Speech, a.MoodSubjective, a.MoodObjective, a.Affect,
                a.ThoughtsFormAndContent, a.Perceptions, a.Cognition, a.Insight,
                a.EnergyAndSleep, a.Appetite, a.SocialIsolation,
                a.SubstanceUse, a.SocialCircumstances,
                a.CapacityToConsent, a.CapacityNotes, a.OverallRiskRating,
                a.ClinicalFormulation, a.RecommendedPlan, a.SafetyPlan,
                a.FollowUpFrequency, a.NextAppointmentDate,
                AuthorName = db.Users.Where(u => u.Id == a.AuthorStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                a.CreatedAt, a.SubmittedAt,
            })
            .FirstOrDefaultAsync(cancellationToken);

        // No assessment yet: the guest is free to start Part 1.
        if (assessment is null) return new GuestCpnAssessmentDto(null, true);

        var domains = await db.CpnRiskDomainRatings.AsNoTracking()
            .Where(d => d.AssessmentId == assessment.Id)
            .OrderBy(d => d.Domain)
            .Select(d => new CpnRiskDomainDto(d.Domain, d.Rating, d.Notes))
            .ToListAsync(cancellationToken);

        var dto = new CpnInitialAssessmentDto(
            assessment.Id, assessment.GuestId, assessment.Status, assessment.ContactMethod, assessment.OccurredAt,
            assessment.MethodOfAssessment, assessment.OthersPresent,
            assessment.ReasonForReferral, assessment.ReferredBy, assessment.CurrentDiagnosis,
            assessment.DiagnosisDetail, assessment.CurrentMedication,
            assessment.PreviousPresentations, assessment.PreviousInpatientAdmission, assessment.PreviousMhaSection,
            assessment.TalkingTherapies, assessment.PersonalHistory, assessment.FamilyMentalIllness,
            assessment.AppearanceAndBehaviour, assessment.Speech, assessment.MoodSubjective, assessment.MoodObjective,
            assessment.Affect, assessment.ThoughtsFormAndContent, assessment.Perceptions, assessment.Cognition,
            assessment.Insight, assessment.EnergyAndSleep, assessment.Appetite, assessment.SocialIsolation,
            assessment.SubstanceUse, assessment.SocialCircumstances,
            assessment.CapacityToConsent, assessment.CapacityNotes, assessment.OverallRiskRating, domains,
            assessment.ClinicalFormulation, assessment.RecommendedPlan, assessment.SafetyPlan,
            assessment.FollowUpFrequency, assessment.NextAppointmentDate,
            assessment.AuthorName, assessment.CreatedAt, assessment.SubmittedAt);

        // A draft is resumable; a submitted Part 1 closes the door on a second one.
        return new GuestCpnAssessmentDto(dto, assessment.Status != CpnAssessmentStatus.Submitted);
    }

    private sealed record ContactCursor(DateTimeOffset OccurredAt, Guid Id);

    public async Task<KeysetPage<GuestContactSummaryDto>> GetContactHistoryAsync(
        Guid guestId, string? cursor, int pageSize, CancellationToken cancellationToken = default)
    {
        var decoded = KeysetCursor.Decode<ContactCursor>(cursor);

        var query = db.Contacts.AsNoTracking().Where(c => c.GuestId == guestId);
        if (decoded is not null)
        {
            query = query.Where(c => c.OccurredAt < decoded.OccurredAt
                || (c.OccurredAt == decoded.OccurredAt && c.Id.CompareTo(decoded.Id) < 0));
        }

        var rows = await query
            .OrderByDescending(c => c.OccurredAt).ThenByDescending(c => c.Id)
            .Take(pageSize + 1)
            .Select(c => new
            {
                c.Id, c.OccurredAt,
                Type = c.Type.ToString(),
                Outcome = c.Outcome.ToString(),
                CreatedByName = db.Users.Where(u => u.Id == c.CreatedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "Unknown",
                Category = db.CaseworkNotes.Where(n => n.ContactId == c.Id).Select(n => n.Category).FirstOrDefault(),
                IsCpnContact = db.CaseworkNotes.Any(n => n.ContactId == c.Id && n.IsCpnContact),
            })
            .ToListAsync(cancellationToken);

        var hasMore = rows.Count > pageSize;
        var page = rows.Take(pageSize)
            .Select(r => new GuestContactSummaryDto(r.Id, r.Type, r.Outcome, r.OccurredAt, r.CreatedByName, r.Category?.ToString(), r.IsCpnContact))
            .ToList();

        return new KeysetPage<GuestContactSummaryDto>
        {
            Items = page,
            NextCursor = hasMore ? KeysetCursor.Encode(new ContactCursor(page[^1].OccurredAt, page[^1].Id)) : null,
            HasMore = hasMore,
            TotalCount = decoded is null
                ? await db.Contacts.AsNoTracking().CountAsync(c => c.GuestId == guestId, cancellationToken)
                : null,
        };
    }

    public async Task<IReadOnlyList<CaseloadAssignmentDto>> GetCaseloadHistoryAsync(Guid guestId, CancellationToken cancellationToken = default) =>
        await db.CaseloadAssignments.AsNoTracking()
            .Where(a => a.GuestId == guestId)
            .OrderByDescending(a => a.RecordedAt)
            .Select(a => new CaseloadAssignmentDto(
                a.Id,
                db.Users.Where(u => u.Id == a.FromStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                db.Users.Where(u => u.Id == a.ToStaffId).Select(u => u.DisplayName).FirstOrDefault(),
                a.Reason,
                db.Users.Where(u => u.Id == a.RecordedByStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "System",
                a.RecordedAt))
            .ToListAsync(cancellationToken);

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
                r.ImmediateRisk, r.NextContactDate,
                db.Guests.Where(g => g.Id == r.GuestId).Select(g => g.Pathway).FirstOrDefault(),
                db.Guests.Where(g => g.Id == r.GuestId).Select(g => g.AfaSupportNeeded).FirstOrDefault(),
                db.Guests.Where(g => g.Id == r.GuestId)
                    .Select(g => db.Users.Where(u => u.Id == g.AssignedCmhwId).Select(u => u.DisplayName).FirstOrDefault())
                    .FirstOrDefault(),
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
        public bool IsUrgent { get; set; }
        public string? AssignedCmhwName { get; set; }
        public DateTimeOffset RegisteredAt { get; set; }
        public DateTimeOffset? LastContactAt { get; set; }
        public string? PathwayCategory { get; set; }
        public string? Pathway { get; set; }
        public bool HasRiskFlags { get; set; }
        public DateTime? NextContactDue { get; set; }
    }

    public async Task<IReadOnlyList<Emhip.Application.Guests.Compliance.GuestAuditEntryDto>> GetAccessLogAsync(
        Guid hubId, Guid guestId, int limit, CancellationToken cancellationToken = default)
    {
        // IgnoreQueryFilters: the log must stay readable after the guest is anonymised (soft-deleted).
        var inHub = await db.Guests.IgnoreQueryFilters().AsNoTracking().AnyAsync(g => g.Id == guestId && g.HubId == hubId, cancellationToken);
        if (!inHub) return [];

        var entries = await db.AuditEvents.AsNoTracking()
            .Where(a => a.GuestId == guestId)
            .OrderByDescending(a => a.OccurredAt)
            .Take(limit)
            .Select(a => new Emhip.Application.Guests.Compliance.GuestAuditEntryDto(
                a.Id, a.OccurredAt,
                db.Users.Where(u => u.Id == a.ActorStaffId).Select(u => u.DisplayName).FirstOrDefault() ?? "System",
                a.Action.ToString(), a.EntityName, a.EntityId, a.Details, ""))
            .ToListAsync(cancellationToken);

        // Plain-English wording is derived in memory — it is not something SQL can translate.
        return entries
            .Select(e => e with { Description = Emhip.Application.Audit.AuditDescriptions.Describe(e.Action, e.EntityName, e.Details) })
            .ToList();
    }
}
