namespace Emhip.Application.Reports;

public interface IReportReadService
{
    Task<PathwayReportDto> GetPathwayReportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    Task<DialogOutcomesReportDto> GetDialogOutcomesAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<PathwayAnalyticsDto> GetPathwayAnalyticsAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CaseloadReportRowDto>> GetCaseloadReportAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<DataQualityReportDto> GetDataQualityReportAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<ContactsBreakdownReportDto> GetContactsBreakdownAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DialogTrendPointDto>> GetDialogTrendAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<BreakdownSliceDto>> GetReferralSourcesAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ExportHistoryItemDto>> GetExportHistoryAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>Streams rows for CSV export — never materializes the full result set in memory.</summary>
    IAsyncEnumerable<ReportExportRowDto> StreamExportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}
