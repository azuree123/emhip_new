using MediatR;

namespace Emhip.Application.Reports;

/// <summary>
/// Everything the multi-sheet Excel export needs, gathered in one query (spec §5.4). Every sheet
/// is computed for the same reporting period the Reports screen shows, so the workbook matches it.
/// </summary>
public sealed record ServiceReportExportDto(
    string OrganisationName,
    DateOnly From,
    DateOnly To,
    DateTimeOffset GeneratedAt,
    /// <summary>Guests registered in the period, by their current status.</summary>
    GuestStatusCountsDto StatusCounts,
    /// <summary>The Overview's "Contact activity" figures for the period.</summary>
    ReportActivityDto Activity,
    IReadOnlyList<PathwayAnalyticsRowDto> Pathways,
    IReadOnlyList<CaseloadReportRowDto> Caseload,
    DialogOutcomesReportDto Outcomes,
    DataQualityReportDto DataQuality,
    /// <summary>Demographics and referral sources — on every export (customer feedback #9).</summary>
    ReportBreakdownsDto Breakdowns,
    /// <summary>The cohort the DIALOG outcomes sheet was computed over ("All guests" when unfiltered).</summary>
    string OutcomesCohort);

/// <summary>Builds the .xlsx bytes. Implemented in Infrastructure so the spreadsheet library stays out of Application.</summary>
public interface IExcelWorkbookBuilder
{
    byte[] BuildServiceReport(ServiceReportExportDto report);
}

/// <summary>
/// <paramref name="DialogCohort"/> carries the DIALOG Outcomes tab's demographic filters into the
/// workbook's DIALOG outcomes sheet, so an export taken while viewing a cohort reports that cohort.
/// </summary>
public sealed record GetServiceReportExportQuery(Guid HubId, DateOnly From, DateOnly To, ReportCohortFilter? DialogCohort = null)
    : IRequest<ServiceReportExportDto>;

public sealed class GetServiceReportExportQueryHandler(IReportReadService reads, Abstractions.IAppSettingsService settings)
    : IRequestHandler<GetServiceReportExportQuery, ServiceReportExportDto>
{
    public async Task<ServiceReportExportDto> Handle(GetServiceReportExportQuery request, CancellationToken cancellationToken)
    {
        var cohort = request.DialogCohort ?? ReportCohortFilter.None;
        var period = new ReportPeriod(request.From, request.To);

        var pathwayReport = await reads.GetPathwayReportAsync(request.HubId, request.From, request.To, cancellationToken);
        var analytics = await reads.GetPathwayAnalyticsAsync(request.HubId, period, cancellationToken);
        var caseload = await reads.GetCaseloadReportAsync(request.HubId, period, cancellationToken);
        var outcomes = await reads.GetDialogOutcomesAsync(request.HubId, cohort, period, cancellationToken);
        var dataQuality = await reads.GetDataQualityReportAsync(request.HubId, period, cancellationToken);
        var breakdowns = await reads.GetBreakdownsAsync(request.HubId, request.From, request.To, cancellationToken);

        var organisation = await settings.GetAsync(Settings.SettingsCatalog.Keys.OrganisationName, cancellationToken) ?? "EMHIP";

        return new ServiceReportExportDto(
            organisation, request.From, request.To, DateTimeOffset.UtcNow,
            pathwayReport.StatusCounts, pathwayReport.Activity, analytics.Pathways, caseload, outcomes, dataQuality,
            breakdowns, cohort.Describe());
    }
}
