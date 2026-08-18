namespace Emhip.Application.Reports;

public interface IReportReadService
{
    Task<PathwayReportDto> GetPathwayReportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    Task<DialogOutcomesReportDto> GetDialogOutcomesAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>Streams rows for CSV export — never materializes the full result set in memory.</summary>
    IAsyncEnumerable<ReportExportRowDto> StreamExportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}
