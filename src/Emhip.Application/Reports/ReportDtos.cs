namespace Emhip.Application.Reports;

public sealed record PathwayReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<PathwayCategoryTotalDto> CategoryTotals,
    int TotalReferrals,
    GuestStatusCountsDto StatusCounts,
    IReadOnlyList<MonthlyCountDto> MonthlyRegistrations,
    ReportActivityDto Activity,
    IReadOnlyList<BreakdownSliceDto> EthnicityBreakdown);

public sealed record PathwayCategoryTotalDto(string Category, int Count, double Percentage);

/// <summary>Current hub-wide guest counts by status (point-in-time, not range-scoped) — the report header KPI tiles.</summary>
public sealed record GuestStatusCountsDto(int Total, int Active, int PendingConversation, int Inactive, int Urgent);

/// <summary>"Guest registrations over time" chart — registrations per calendar month inside the range.</summary>
public sealed record MonthlyCountDto(int Year, int Month, int Count);

/// <summary>"Activity this period" card — event counts inside the requested range.</summary>
public sealed record ReportActivityDto(int GuestsSeen, int UrgentFlagsRaised, int FollowUpEntries, int ContactsRecorded);

/// <summary>"Ethnicity breakdown" chart slice (from recorded guest demographics).</summary>
public sealed record BreakdownSliceDto(string Label, int Count, double Percentage);

/// <summary>One row of the streamed CSV export.</summary>
public sealed record ReportExportRowDto(
    Guid GuestId,
    string GuestName,
    string Category,
    string Status,
    DateTimeOffset ReferredAt);
