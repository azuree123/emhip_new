using MediatR;

namespace Emhip.Application.Dashboards;

public sealed record GetCmhwDashboardQuery(Guid StaffId, Guid HubId) : IRequest<CmhwDashboardDto>;

public sealed class GetCmhwDashboardQueryHandler(IDashboardReadService reads) : IRequestHandler<GetCmhwDashboardQuery, CmhwDashboardDto>
{
    public Task<CmhwDashboardDto> Handle(GetCmhwDashboardQuery request, CancellationToken cancellationToken) =>
        reads.GetCmhwDashboardAsync(request.StaffId, request.HubId, cancellationToken);
}

public sealed record GetHubManagerDashboardQuery(Guid HubId) : IRequest<HubManagerDashboardDto>;

public sealed class GetHubManagerDashboardQueryHandler(IDashboardReadService reads) : IRequestHandler<GetHubManagerDashboardQuery, HubManagerDashboardDto>
{
    public Task<HubManagerDashboardDto> Handle(GetHubManagerDashboardQuery request, CancellationToken cancellationToken) =>
        reads.GetHubManagerDashboardAsync(request.HubId, cancellationToken);
}
