using Emhip.Domain.Enums;
namespace Emhip.Application.Reports;

public sealed record PathwayReportDto(
    DateOnly From,
    DateOnly To,
    // Guests registered in the period, by the clinical pathway they are on now (enum name in
    // Category), and how many of them are allocated in all — the same guests as the status tiles.
    IReadOnlyList<PathwayCategoryTotalDto> CategoryTotals,
    int TotalAllocated,
    GuestStatusCountsDto StatusCounts,
    IReadOnlyList<MonthlyCountDto> MonthlyRegistrations,
    ReportActivityDto Activity,
    IReadOnlyList<BreakdownSliceDto> EthnicityBreakdown);

public sealed record PathwayCategoryTotalDto(string Category, int Count, double Percentage);

/// <summary>
/// The report header KPI tiles: guests registered in the reporting period, by their current status
/// (Urgent counts those currently flagged). The CSV export lists exactly these guests.
/// </summary>
public sealed record GuestStatusCountsDto(int Total, int Active, int PendingConversation, int Inactive, int Urgent);

/// <summary>"Guest registrations over time" chart — registrations per calendar month inside the range.</summary>
public sealed record MonthlyCountDto(int Year, int Month, int Count);

/// <summary>"Activity this period" card — event counts inside the requested range.</summary>
public sealed record ReportActivityDto(int GuestsSeen, int UrgentFlagsRaised, int FollowUpEntries, int ContactsRecorded);

/// <summary>"Ethnicity breakdown" chart slice (from recorded guest demographics).</summary>
public sealed record BreakdownSliceDto(string Label, int Count, double Percentage);

/// <summary>
/// "Outcome dimensions" report — average DIALOG score per domain, baseline vs latest reassessment,
/// over the hub's guests or a demographic cohort of them (<see cref="ReportCohortFilter"/>).
/// </summary>
public sealed record DialogOutcomesReportDto(
    int GuestsWithBaseline,
    int GuestsWithFollowUp,
    IReadOnlyList<DialogDimensionDto> Dimensions,
    /// <summary>Guests in the cohort the figures were computed over — every hub guest when unfiltered.</summary>
    int CohortGuests,
    /// <summary>
    /// Guests whose baseline is in the period but who have no reassessment in it — counted
    /// directly, since a period's reassessments can belong to guests baselined before it.
    /// </summary>
    int GuestsAwaitingReassessment);

/// <summary>Averages are null when no assessments exist for that cohort.</summary>
public sealed record DialogDimensionDto(string Key, string Label, double? BaselineAverage, double? LatestAverage);

/// <summary>"Pathway Analytics" tab — per allocated clinical pathway, over the guests registered in the reporting period.</summary>
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

/// <summary>
/// "Caseload Reports" tab — per CMHW in the hub. Assigned / active / urgent are the current
/// caseload; overdue contacts and contacts recorded follow the reporting period (see
/// IReportReadService.GetCaseloadReportAsync).
/// </summary>
public sealed record CaseloadReportRowDto(
    Guid StaffId,
    string DisplayName,
    int AssignedGuests,
    int ActiveGuests,
    int UrgentGuests,
    int OverdueFollowUps,
    int ContactsInPeriod);

/// <summary>"Data Quality" tab — completeness issues across the guests registered in the reporting period.</summary>
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

/// <summary>
/// One row of the streamed CSV export — a guest registered in the period, with their clinical
/// pathway, status, demographics and referral source.
/// </summary>
public sealed record ReportExportRowDto(
    int GuestNumber,
    string GuestName,
    string Pathway,
    string Status,
    DateTimeOffset RegisteredAt,
    string? Ethnicity,
    /// <summary>Age group on the export date (<see cref="ReportAgeBands"/>).</summary>
    string AgeGroup,
    string? Gender,
    string? CountryOfOrigin,
    string? ReferralSource,
    string? ReferralType);

/// <summary>
/// Demographic and referral-source breakdowns every Excel export carries (feedback: "required for
/// every report"). Each row counts all current guests and, separately, the guests registered in
/// the export period; blanks are reported as "Not recorded" rather than dropped.
/// </summary>
public sealed record ReportBreakdownsDto(
    int TotalGuests,
    int RegisteredInPeriod,
    IReadOnlyList<ReportBreakdownRowDto> Ethnicity,
    IReadOnlyList<ReportBreakdownRowDto> AgeGroups,
    IReadOnlyList<ReportBreakdownRowDto> Gender,
    IReadOnlyList<ReportBreakdownRowDto> CountryOfOrigin,
    IReadOnlyList<ReportBreakdownRowDto> ReferralSources,
    IReadOnlyList<ReportBreakdownRowDto> ReferralTypes,
    /// <summary>Subcategories of Secondary referrals only (spec §6.2).</summary>
    IReadOnlyList<ReportBreakdownRowDto> SecondaryReferralSubcategories);

public sealed record ReportBreakdownRowDto(string Label, int AllGuests, int RegisteredInPeriod);

/// <summary>"CPN Activity" reports tab (design Desktop 86): the CPN referral pipeline and the guests on the CPN caseload.</summary>
public sealed record CpnActivityReportDto(
    DateOnly From,
    DateOnly To,
    /// <summary>Distinct guests with a submitted CPN contact in the range.</summary>
    int GuestsSeenByCpn,
    /// <summary>Guests with a confirmed CPN referral (or flagged CPN-involved on their clinical profile) right now.</summary>
    int ActiveCpnCaseload,
    /// <summary>CPN referrals requested in the range.</summary>
    int NewCpnReferrals,
    int ReferralsConfirmedAtMdt,
    int ReferralsDeclinedAtMdt,
    /// <summary>CPN referrals requested in the range that are still awaiting MDT review.</summary>
    int ReferralsPendingReview,
    /// <summary>
    /// Average days from the referral being confirmed to the first CPN contact, over referrals
    /// confirmed in the range that have had one.
    /// </summary>
    double? AvgDaysReferralToContact,
    int CpnContactsInRange,
    IReadOnlyList<CpnCaseloadRowDto> Caseload);

public sealed record CpnCaseloadRowDto(
    Guid GuestId,
    int GuestNumber,
    string GuestName,
    string GuestStatus,
    GuestPathway? Pathway,
    string? AssignedCmhwName,
    string? CpnName,
    DateTimeOffset? DateOfReferral,
    DateTimeOffset? ConfirmedAt,
    int CpnSessions,
    DateTimeOffset? LastCpnContactAt,
    DateOnly? NextContactDue);
