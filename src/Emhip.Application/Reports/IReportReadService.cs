namespace Emhip.Application.Reports;

/// <summary>
/// Report reads. Every tab of the Reports screen takes the shared reporting period; a null
/// <see cref="ReportPeriod"/> means "unscoped" (all records, or the live view where a figure is
/// inherently current — used by callers outside the Reports screen, such as the dashboard).
/// </summary>
public interface IReportReadService
{
    /// <summary>Overview tab: guests registered in the period (by status, pathway, ethnicity) and the activity inside it.</summary>
    Task<PathwayReportDto> GetPathwayReportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>
    /// DIALOG baseline vs latest averages over the assessments recorded in <paramref name="period"/>;
    /// <paramref name="cohort"/> narrows it to a demographic cohort.
    /// </summary>
    Task<DialogOutcomesReportDto> GetDialogOutcomesAsync(Guid hubId, ReportCohortFilter? cohort = null, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>Per-pathway figures for the guests registered in <paramref name="period"/>.</summary>
    Task<PathwayAnalyticsDto> GetPathwayAnalyticsAsync(Guid hubId, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Per-CMHW rows. Assigned / active / urgent guests are always the current caseload. With a
    /// period, overdue contacts are those due inside it and contacts are those recorded inside it;
    /// without one (the dashboard), every overdue contact and the last 30 days of contacts.
    /// </summary>
    Task<IReadOnlyList<CaseloadReportRowDto>> GetCaseloadReportAsync(Guid hubId, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>Record-completeness issues over the guests registered in <paramref name="period"/>.</summary>
    Task<DataQualityReportDto> GetDataQualityReportAsync(Guid hubId, ReportPeriod? period = null, CancellationToken cancellationToken = default);
    Task<ContactsBreakdownReportDto> GetContactsBreakdownAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    /// <summary>"CPN Activity" tab — referral pipeline and the CPN caseload.</summary>
    Task<CpnActivityReportDto> GetCpnActivityAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DialogTrendPointDto>> GetDialogTrendAsync(Guid hubId, ReportCohortFilter? cohort = null, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>Referral sources of the guests registered in <paramref name="period"/>.</summary>
    Task<IReadOnlyList<BreakdownSliceDto>> GetReferralSourcesAsync(Guid hubId, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// "How did you hear about us?" answers of the guests registered in <paramref name="period"/>;
    /// a guest counts under every box they ticked.
    /// </summary>
    Task<IReadOnlyList<BreakdownSliceDto>> GetHeardAboutUsAsync(Guid hubId, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>Demographic and referral-source breakdowns for the Excel export — all guests, and those registered in the period.</summary>
    Task<ReportBreakdownsDto> GetBreakdownsAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);

    /// <summary>Exports taken inside <paramref name="period"/>, newest first.</summary>
    Task<IReadOnlyList<ExportHistoryItemDto>> GetExportHistoryAsync(Guid hubId, ReportPeriod? period = null, CancellationToken cancellationToken = default);

    /// <summary>Streams rows for CSV export — never materializes the full result set in memory.</summary>
    IAsyncEnumerable<ReportExportRowDto> StreamExportAsync(Guid hubId, DateOnly from, DateOnly to, CancellationToken cancellationToken = default);
}
