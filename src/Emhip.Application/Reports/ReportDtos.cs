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

/// <summary>"Outcome dimensions" report — hub-wide average DIALOG score per domain, baseline vs latest follow-up.</summary>
public sealed record DialogOutcomesReportDto(
    int GuestsWithBaseline,
    int GuestsWithFollowUp,
    IReadOnlyList<DialogDimensionDto> Dimensions);

/// <summary>Averages are null when no assessments exist for that cohort.</summary>
public sealed record DialogDimensionDto(string Key, string Label, double? BaselineAverage, double? LatestAverage);

/// <summary>"Pathway Analytics" tab — per allocated clinical pathway.</summary>
public sealed record PathwayAnalyticsDto(
    int UnallocatedGuests,
    IReadOnlyList<PathwayAnalyticsRowDto> Pathways);

public sealed record PathwayAnalyticsRowDto(
    string Pathway,
    int TotalGuests,
    int ActiveGuests,
    int UrgentGuests,
    int InactiveGuests,
    int AfaSupportCount,
    double? AvgLatestDialogTotal);

/// <summary>"Caseload Reports" tab — per CMHW in the hub.</summary>
public sealed record CaseloadReportRowDto(
    Guid StaffId,
    string DisplayName,
    int AssignedGuests,
    int ActiveGuests,
    int UrgentGuests,
    int OverdueFollowUps,
    int ContactsLast30Days);

/// <summary>"Data Quality" tab — completeness issues across the hub's guests.</summary>
public sealed record DataQualityReportDto(int TotalGuests, IReadOnlyList<DataQualityIssueDto> Issues);

public sealed record DataQualityIssueDto(string Key, string Label, int Count);

/// <summary>"CPN Activity" / contacts breakdown — counts per contact type and outcome in the range.</summary>
public sealed record ContactsBreakdownReportDto(
    DateOnly From,
    DateOnly To,
    int TotalContacts,
    IReadOnlyList<BreakdownSliceDto> ByType,
    IReadOnlyList<BreakdownSliceDto> ByOutcome);

/// <summary>"DIALOG score trend" — average total score of assessments recorded in each month.</summary>
public sealed record DialogTrendPointDto(int Year, int Month, double AverageTotal, int Assessments);

/// <summary>One "Export history" row.</summary>
public sealed record ExportHistoryItemDto(
    Guid Id, DateTimeOffset ExportedAt, string ExportedByName, string ExportType, DateOnly FromDate, DateOnly ToDate);

/// <summary>One row of the streamed CSV export.</summary>
public sealed record ReportExportRowDto(
    Guid GuestId,
    string GuestName,
    string Category,
    string Status,
    DateTimeOffset ReferredAt);
