using MediatR;

namespace Emhip.Application.Reports;

/// <summary>Everything the multi-sheet Excel export needs, gathered in one query (spec §5.4).</summary>
public sealed record ServiceReportExportDto(
    string OrganisationName,
    DateOnly From,
    DateOnly To,
    DateTimeOffset GeneratedAt,
    GuestStatusCountsDto StatusCounts,
    IReadOnlyList<PathwayAnalyticsRowDto> Pathways,
    IReadOnlyList<CaseloadReportRowDto> Caseload,
    DialogOutcomesReportDto Outcomes,
    DataQualityReportDto DataQuality);

/// <summary>Builds the .xlsx bytes. Implemented in Infrastructure so the spreadsheet library stays out of Application.</summary>
public interface IExcelWorkbookBuilder
{
    byte[] BuildServiceReport(ServiceReportExportDto report);
}

public sealed record GetServiceReportExportQuery(Guid HubId, DateOnly From, DateOnly To) : IRequest<ServiceReportExportDto>;

public sealed class GetServiceReportExportQueryHandler(IReportReadService reads, Abstractions.IAppSettingsService settings)
    : IRequestHandler<GetServiceReportExportQuery, ServiceReportExportDto>
{
    public async Task<ServiceReportExportDto> Handle(GetServiceReportExportQuery request, CancellationToken cancellationToken)
    {
        var pathwayReport = await reads.GetPathwayReportAsync(request.HubId, request.From, request.To, cancellationToken);
        var analytics = await reads.GetPathwayAnalyticsAsync(request.HubId, cancellationToken);
        var caseload = await reads.GetCaseloadReportAsync(request.HubId, cancellationToken);
        var outcomes = await reads.GetDialogOutcomesAsync(request.HubId, cancellationToken);
        var dataQuality = await reads.GetDataQualityReportAsync(request.HubId, cancellationToken);

        var organisation = await settings.GetAsync(Settings.SettingsCatalog.Keys.OrganisationName, cancellationToken) ?? "EMHIP";

        return new ServiceReportExportDto(
            organisation, request.From, request.To, DateTimeOffset.UtcNow,
            pathwayReport.StatusCounts, analytics.Pathways, caseload, outcomes, dataQuality);
    }
}
