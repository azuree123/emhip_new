using MediatR;

namespace Emhip.Application.Reports;

public sealed record GetPathwayReportQuery(Guid HubId, DateOnly From, DateOnly To) : IRequest<PathwayReportDto>;

public sealed class GetPathwayReportQueryHandler(IReportReadService reads) : IRequestHandler<GetPathwayReportQuery, PathwayReportDto>
{
    public Task<PathwayReportDto> Handle(GetPathwayReportQuery request, CancellationToken cancellationToken) =>
        reads.GetPathwayReportAsync(request.HubId, request.From, request.To, cancellationToken);
}
