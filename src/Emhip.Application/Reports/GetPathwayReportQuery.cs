using MediatR;

namespace Emhip.Application.Reports;

public sealed record GetPathwayReportQuery(Guid HubId, DateOnly From, DateOnly To) : IRequest<PathwayReportDto>;

public sealed class GetPathwayReportQueryHandler(IReportReadService reads) : IRequestHandler<GetPathwayReportQuery, PathwayReportDto>
{
    public Task<PathwayReportDto> Handle(GetPathwayReportQuery request, CancellationToken cancellationToken) =>
        reads.GetPathwayReportAsync(request.HubId, request.From, request.To, cancellationToken);
}

public sealed record GetDialogOutcomesReportQuery(Guid HubId) : IRequest<DialogOutcomesReportDto>;

public sealed class GetDialogOutcomesReportQueryHandler(IReportReadService reads) : IRequestHandler<GetDialogOutcomesReportQuery, DialogOutcomesReportDto>
{
    public Task<DialogOutcomesReportDto> Handle(GetDialogOutcomesReportQuery request, CancellationToken cancellationToken) =>
        reads.GetDialogOutcomesAsync(request.HubId, cancellationToken);
}
