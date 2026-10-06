using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using MediatR;

namespace Emhip.Application.Reports;

// Thin pass-throughs to IReportReadService, mirroring GetPathwayReportQuery. A null Period is
// unscoped; the Reports screen always sends its shared reporting period.

public sealed record GetPathwayAnalyticsQuery(Guid HubId, ReportPeriod? Period = null) : IRequest<PathwayAnalyticsDto>;
public sealed class GetPathwayAnalyticsQueryHandler(IReportReadService reads) : IRequestHandler<GetPathwayAnalyticsQuery, PathwayAnalyticsDto>
{
    public Task<PathwayAnalyticsDto> Handle(GetPathwayAnalyticsQuery request, CancellationToken cancellationToken) =>
        reads.GetPathwayAnalyticsAsync(request.HubId, request.Period, cancellationToken);
}

public sealed record GetCaseloadReportQuery(Guid HubId, ReportPeriod? Period = null) : IRequest<IReadOnlyList<CaseloadReportRowDto>>;
public sealed class GetCaseloadReportQueryHandler(IReportReadService reads) : IRequestHandler<GetCaseloadReportQuery, IReadOnlyList<CaseloadReportRowDto>>
{
    public Task<IReadOnlyList<CaseloadReportRowDto>> Handle(GetCaseloadReportQuery request, CancellationToken cancellationToken) =>
        reads.GetCaseloadReportAsync(request.HubId, request.Period, cancellationToken);
}

public sealed record GetDataQualityReportQuery(Guid HubId, ReportPeriod? Period = null) : IRequest<DataQualityReportDto>;
public sealed class GetDataQualityReportQueryHandler(IReportReadService reads) : IRequestHandler<GetDataQualityReportQuery, DataQualityReportDto>
{
    public Task<DataQualityReportDto> Handle(GetDataQualityReportQuery request, CancellationToken cancellationToken) =>
        reads.GetDataQualityReportAsync(request.HubId, request.Period, cancellationToken);
}

public sealed record GetContactsBreakdownQuery(Guid HubId, DateOnly From, DateOnly To) : IRequest<ContactsBreakdownReportDto>;
public sealed class GetContactsBreakdownQueryHandler(IReportReadService reads) : IRequestHandler<GetContactsBreakdownQuery, ContactsBreakdownReportDto>
{
    public Task<ContactsBreakdownReportDto> Handle(GetContactsBreakdownQuery request, CancellationToken cancellationToken) =>
        reads.GetContactsBreakdownAsync(request.HubId, request.From, request.To, cancellationToken);
}

public sealed record GetDialogTrendQuery(Guid HubId, ReportCohortFilter? Cohort = null, ReportPeriod? Period = null) : IRequest<IReadOnlyList<DialogTrendPointDto>>;
public sealed class GetDialogTrendQueryHandler(IReportReadService reads) : IRequestHandler<GetDialogTrendQuery, IReadOnlyList<DialogTrendPointDto>>
{
    public Task<IReadOnlyList<DialogTrendPointDto>> Handle(GetDialogTrendQuery request, CancellationToken cancellationToken) =>
        reads.GetDialogTrendAsync(request.HubId, request.Cohort, request.Period, cancellationToken);
}

public sealed record GetReferralSourcesQuery(Guid HubId, ReportPeriod? Period = null) : IRequest<IReadOnlyList<BreakdownSliceDto>>;
public sealed class GetReferralSourcesQueryHandler(IReportReadService reads) : IRequestHandler<GetReferralSourcesQuery, IReadOnlyList<BreakdownSliceDto>>
{
    public Task<IReadOnlyList<BreakdownSliceDto>> Handle(GetReferralSourcesQuery request, CancellationToken cancellationToken) =>
        reads.GetReferralSourcesAsync(request.HubId, request.Period, cancellationToken);
}

public sealed record GetExportHistoryQuery(Guid HubId, ReportPeriod? Period = null) : IRequest<IReadOnlyList<ExportHistoryItemDto>>;
public sealed class GetExportHistoryQueryHandler(IReportReadService reads) : IRequestHandler<GetExportHistoryQuery, IReadOnlyList<ExportHistoryItemDto>>
{
    public Task<IReadOnlyList<ExportHistoryItemDto>> Handle(GetExportHistoryQuery request, CancellationToken cancellationToken) =>
        reads.GetExportHistoryAsync(request.HubId, request.Period, cancellationToken);
}

/// <summary>Appends an Export history row; called by the export endpoint after a successful stream.</summary>
public sealed record RecordExportCommand(string ExportType, DateOnly From, DateOnly To) : IRequest;
public sealed class RecordExportCommandHandler(IAppDbContext db, ICurrentUser currentUser) : IRequestHandler<RecordExportCommand>
{
    public async Task Handle(RecordExportCommand request, CancellationToken cancellationToken)
    {
        db.ExportRecords.Add(new ExportRecord(currentUser.HubId, currentUser.StaffId, request.ExportType, request.From, request.To));
        await db.SaveChangesAsync(cancellationToken);
    }
}

public sealed record GetCpnActivityQuery(Guid HubId, DateOnly From, DateOnly To) : IRequest<CpnActivityReportDto>;
public sealed class GetCpnActivityQueryHandler(IReportReadService reads) : IRequestHandler<GetCpnActivityQuery, CpnActivityReportDto>
{
    public Task<CpnActivityReportDto> Handle(GetCpnActivityQuery request, CancellationToken cancellationToken) =>
        reads.GetCpnActivityAsync(request.HubId, request.From, request.To, cancellationToken);
}
