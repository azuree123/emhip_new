namespace Emhip.Application.Dashboards;

/// <summary>Precomputed by the report-materializer worker — never a live GROUP BY. Backs the Dashboard screen.</summary>
public sealed record CmhwDashboardDto(
    int TotalActiveGuests,
    int PendingConversationGuests,
    int InactiveGuests,
    int UrgentGuests,
    IReadOnlyList<ActiveGuestRowDto> ActiveGuests,
    IReadOnlyList<UrgentCases.UrgentCaseDto> UrgentBanner);

public sealed record ActiveGuestRowDto(Guid GuestId, string Name, string Status, DateTimeOffset? LastContactAt, DateOnly? NextFollowUpDue);

/// <summary>Backs the Service Overview screen.</summary>
public sealed record HubManagerDashboardDto(
    int TotalGuestsAcrossHub,
    IReadOnlyList<PathwayDistributionDto> PathwayDistribution,
    IReadOnlyList<MonthlyStatDto> MonthlyStats,
    IReadOnlyList<RecentActivityDto> RecentActivity);

public sealed record PathwayDistributionDto(string Category, int Count, double Percentage);

public sealed record MonthlyStatDto(int Year, int Month, int NewGuests, int ClosedGuests, int Contacts);

public sealed record RecentActivityDto(string Description, string ActorName, DateTimeOffset OccurredAt);
