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
    IReadOnlyList<ClinicalIndicatorDto> ClinicalComplexity);

public sealed record PathwayDistributionDto(string Category, int Count, double Percentage);

public sealed record MonthlyStatDto(int Year, int Month, int NewGuests, int ClosedGuests, int Contacts);

public sealed record RecentActivityDto(string Description, string ActorName, DateTimeOffset OccurredAt);
