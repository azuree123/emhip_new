namespace Emhip.Application.Reports;

public sealed record PathwayReportDto(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<PathwayCategoryTotalDto> CategoryTotals,
    int TotalReferrals);

public sealed record PathwayCategoryTotalDto(string Category, int Count, double Percentage);

/// <summary>One row of the streamed CSV export.</summary>
public sealed record ReportExportRowDto(
    Guid GuestId,
    string GuestName,
    string Category,
    string Status,
    DateTimeOffset ReferredAt);
