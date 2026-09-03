namespace Emhip.Application.Dashboards;

/// <summary>Precomputed by the report-materializer worker — never a live GROUP BY. Backs the Dashboard screen.</summary>
public sealed record CmhwDashboardDto(
    int TotalActiveGuests,
    int PendingConversationGuests,
    int InactiveGuests,
    int UrgentGuests,
    IReadOnlyList<ActiveGuestRowDto> ActiveGuests,
    IReadOnlyList<UrgentCases.UrgentCaseDto> UrgentBanner,
    IReadOnlyList<ClinicalIndicatorDto> ClinicalComplexity);

/// <summary>
/// One "Clinical Complexity Indicators" tile — the number of guests in the hub whose latest
/// (highest-version) risk assessment carries the flag.
/// </summary>
public sealed record ClinicalIndicatorDto(string Label, int Count);

public sealed record ActiveGuestRowDto(Guid GuestId, string Name, string Status, DateTimeOffset? LastContactAt, DateOnly? NextFollowUpDue);

/// <summary>Backs the Service Overview screen.</summary>
public sealed record HubManagerDashboardDto(
    int TotalGuestsAcrossHub,
    int TotalActiveGuests,
    int PendingConversationGuests,
    int InactiveGuests,
    int UrgentGuests,
    IReadOnlyList<PathwayDistributionDto> PathwayDistribution,
    IReadOnlyList<MonthlyStatDto> MonthlyStats,
    IReadOnlyList<RecentActivityDto> RecentActivity,
    IReadOnlyList<ClinicalIndicatorDto> ClinicalComplexity,
    GuestDemographicsBreakdownDto Demographics,
    IReadOnlyList<DataQualityIssueTileDto> DataQuality,
    CpnInvolvementDto CpnInvolvement,
    IReadOnlyList<Reports.CaseloadReportRowDto> CaseloadPerCmhw);

public sealed record PathwayDistributionDto(string Category, int Count, double Percentage);

public sealed record MonthlyStatDto(int Year, int Month, int NewGuests, int ClosedGuests, int Contacts);

public sealed record RecentActivityDto(string Description, string ActorName, DateTimeOffset OccurredAt);

/// <summary>"Guest demographics" dashboard card (design: ethnicity, age groups, country of origin).</summary>
public sealed record GuestDemographicsBreakdownDto(
    IReadOnlyList<DemographicSliceDto> Ethnicity,
    IReadOnlyList<DemographicSliceDto> AgeGroups,
    IReadOnlyList<DemographicSliceDto> Gender,
    IReadOnlyList<DemographicSliceDto> CountryOfOrigin);

public sealed record DemographicSliceDto(string Label, int Count, double Percentage);

/// <summary>One row of the "Data quality issues" card.</summary>
public sealed record DataQualityIssueTileDto(string Key, string Label, int Count);

/// <summary>
/// "CPN involvement" dashboard card — how much of the hub's caseload the Community Psychiatric
/// Nurse is carrying: guests flagged CPN-involved on their clinical profile, submitted Part 1
/// assessments, CPN follow-up sessions and CPN referrals raised in the last 30 days, plus the
/// most recently seen CPN-involved guests.
/// </summary>
public sealed record CpnInvolvementDto(
    int GuestsWithCpnInvolved,
    int InitialAssessmentsSubmitted,
    int FollowUpSessionsLast30Days,
    int CpnReferralsLast30Days,
    IReadOnlyList<CpnInvolvedGuestDto> Guests);

public sealed record CpnInvolvedGuestDto(
    Guid GuestId,
    int GuestNumber,
    string Name,
    string Status,
    string? AssignedCmhwName,
    DateTimeOffset? LastCpnContactAt,
    bool HasInitialAssessment,
    int FollowUpSessions);
