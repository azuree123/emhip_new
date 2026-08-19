using MediatR;

namespace Emhip.Application.Dashboards;

public sealed record GetCmhwDashboardQuery(Guid StaffId, Guid HubId) : IRequest<CmhwDashboardDto>;

public sealed class GetCmhwDashboardQueryHandler(IDashboardReadService reads) : IRequestHandler<GetCmhwDashboardQuery, CmhwDashboardDto>
{
    public Task<CmhwDashboardDto> Handle(GetCmhwDashboardQuery request, CancellationToken cancellationToken) =>
        reads.GetCmhwDashboardAsync(request.StaffId, request.HubId, cancellationToken);
}

public sealed record GetGuestsSeenQuery(Guid HubId, GuestsSeenPeriod Period, Guid? CmhwStaffId, DateOnly? From = null, DateOnly? To = null) : IRequest<GuestsSeenDto>;

public sealed class GetGuestsSeenQueryHandler(IDashboardReadService reads) : IRequestHandler<GetGuestsSeenQuery, GuestsSeenDto>
{
    public Task<GuestsSeenDto> Handle(GetGuestsSeenQuery request, CancellationToken cancellationToken) =>
        reads.GetGuestsSeenAsync(request.HubId, request.Period, request.CmhwStaffId, request.From, request.To, cancellationToken);
}

public sealed record GetHubManagerDashboardQuery(Guid HubId) : IRequest<HubManagerDashboardDto>;

public sealed class GetHubManagerDashboardQueryHandler(IDashboardReadService reads) : IRequestHandler<GetHubManagerDashboardQuery, HubManagerDashboardDto>
{
    public Task<HubManagerDashboardDto> Handle(GetHubManagerDashboardQuery request, CancellationToken cancellationToken) =>
        reads.GetHubManagerDashboardAsync(request.HubId, cancellationToken);
}
