using Emhip.Application.Abstractions;
using Emhip.Domain.Entities;
using MediatR;

namespace Emhip.Application.Reports;

// Thin pass-throughs to IReportReadService, mirroring GetPathwayReportQuery.

public sealed record GetPathwayAnalyticsQuery(Guid HubId) : IRequest<PathwayAnalyticsDto>;
public sealed class GetPathwayAnalyticsQueryHandler(IReportReadService reads) : IRequestHandler<GetPathwayAnalyticsQuery, PathwayAnalyticsDto>
{
    public Task<PathwayAnalyticsDto> Handle(GetPathwayAnalyticsQuery request, CancellationToken cancellationToken) =>
        reads.GetPathwayAnalyticsAsync(request.HubId, cancellationToken);
}

public sealed record GetCaseloadReportQuery(Guid HubId) : IRequest<IReadOnlyList<CaseloadReportRowDto>>;
public sealed class GetCaseloadReportQueryHandler(IReportReadService reads) : IRequestHandler<GetCaseloadReportQuery, IReadOnlyList<CaseloadReportRowDto>>
{
    public Task<IReadOnlyList<CaseloadReportRowDto>> Handle(GetCaseloadReportQuery request, CancellationToken cancellationToken) =>
        reads.GetCaseloadReportAsync(request.HubId, cancellationToken);
}

public sealed record GetDataQualityReportQuery(Guid HubId) : IRequest<DataQualityReportDto>;
public sealed class GetDataQualityReportQueryHandler(IReportReadService reads) : IRequestHandler<GetDataQualityReportQuery, DataQualityReportDto>
{
    public Task<DataQualityReportDto> Handle(GetDataQualityReportQuery request, CancellationToken cancellationToken) =>
        reads.GetDataQualityReportAsync(request.HubId, cancellationToken);
}

public sealed record GetContactsBreakdownQuery(Guid HubId, DateOnly From, DateOnly To) : IRequest<ContactsBreakdownReportDto>;
public sealed class GetContactsBreakdownQueryHandler(IReportReadService reads) : IRequestHandler<GetContactsBreakdownQuery, ContactsBreakdownReportDto>
{
    public Task<ContactsBreakdownReportDto> Handle(GetContactsBreakdownQuery request, CancellationToken cancellationToken) =>
        reads.GetContactsBreakdownAsync(request.HubId, request.From, request.To, cancellationToken);
}

public sealed record GetDialogTrendQuery(Guid HubId) : IRequest<IReadOnlyList<DialogTrendPointDto>>;
public sealed class GetDialogTrendQueryHandler(IReportReadService reads) : IRequestHandler<GetDialogTrendQuery, IReadOnlyList<DialogTrendPointDto>>
{
    public Task<IReadOnlyList<DialogTrendPointDto>> Handle(GetDialogTrendQuery request, CancellationToken cancellationToken) =>
        reads.GetDialogTrendAsync(request.HubId, cancellationToken);
}

public sealed record GetReferralSourcesQuery(Guid HubId) : IRequest<IReadOnlyList<BreakdownSliceDto>>;
public sealed class GetReferralSourcesQueryHandler(IReportReadService reads) : IRequestHandler<GetReferralSourcesQuery, IReadOnlyList<BreakdownSliceDto>>
{
    public Task<IReadOnlyList<BreakdownSliceDto>> Handle(GetReferralSourcesQuery request, CancellationToken cancellationToken) =>
        reads.GetReferralSourcesAsync(request.HubId, cancellationToken);
}

public sealed record GetExportHistoryQuery(Guid HubId) : IRequest<IReadOnlyList<ExportHistoryItemDto>>;
public sealed class GetExportHistoryQueryHandler(IReportReadService reads) : IRequestHandler<GetExportHistoryQuery, IReadOnlyList<ExportHistoryItemDto>>
{
    public Task<IReadOnlyList<ExportHistoryItemDto>> Handle(GetExportHistoryQuery request, CancellationToken cancellationToken) =>
        reads.GetExportHistoryAsync(request.HubId, cancellationToken);
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
