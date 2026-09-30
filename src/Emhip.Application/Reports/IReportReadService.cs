namespace Emhip.Application.Reports;

public interface IReportReadService
{
    Task<PathwayReportDto> GetPathwayReportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>DIALOG baseline vs latest averages; <paramref name="cohort"/> narrows it to a demographic cohort.</summary>
    Task<DialogOutcomesReportDto> GetDialogOutcomesAsync(Guid hubId, ReportCohortFilter? cohort = null, CancellationToken cancellationToken = default);
    Task<PathwayAnalyticsDto> GetPathwayAnalyticsAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CaseloadReportRowDto>> GetCaseloadReportAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<DataQualityReportDto> GetDataQualityReportAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<ContactsBreakdownReportDto> GetContactsBreakdownAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    /// <summary>"CPN Activity" tab — referral pipeline and the CPN caseload.</summary>
    Task<CpnActivityReportDto> GetCpnActivityAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DialogTrendPointDto>> GetDialogTrendAsync(Guid hubId, ReportCohortFilter? cohort = null, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BreakdownSliceDto>> GetReferralSourcesAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>Demographic and referral-source breakdowns for the Excel export — all guests, and those registered in the period.</summary>
    Task<ReportBreakdownsDto> GetBreakdownsAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExportHistoryItemDto>> GetExportHistoryAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>Streams rows for CSV export — never materializes the full result set in memory.</summary>
    IAsyncEnumerable<ReportExportRowDto> StreamExportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}
