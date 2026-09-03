using Emhip.Application.Common;
using MediatR;

namespace Emhip.Application.Contacts;

/// <summary>Contact History nav screen — every contact in the hub, keyset-paginated and filterable.</summary>
public sealed record GetHubContactHistoryQuery(Guid HubId, ContactHistoryFilter Filter, string? Cursor, int PageSize)
    : IRequest<KeysetPage<ContactHistoryRowDto>>;

public sealed class GetHubContactHistoryQueryHandler(IContactReadService reads)
    : IRequestHandler<GetHubContactHistoryQuery, KeysetPage<ContactHistoryRowDto>>
{
    public Task<KeysetPage<ContactHistoryRowDto>> Handle(GetHubContactHistoryQuery request, CancellationToken cancellationToken) =>
        reads.GetHubContactHistoryAsync(request.HubId, request.Filter, request.Cursor, request.PageSize, cancellationToken);
}

/// <summary>Contact History screen — per-guest contact counts across the hub / a caseload.</summary>
public sealed record GetContactsByGuestQuery(Guid HubId, ContactsByGuestFilter Filter, string? Cursor, int PageSize)
    : IRequest<KeysetPage<ContactsByGuestRowDto>>;

public sealed class GetContactsByGuestQueryHandler(IContactReadService reads)
    : IRequestHandler<GetContactsByGuestQuery, KeysetPage<ContactsByGuestRowDto>>
{
    public Task<KeysetPage<ContactsByGuestRowDto>> Handle(GetContactsByGuestQuery request, CancellationToken cancellationToken) =>
        reads.GetContactsByGuestAsync(request.HubId, request.Filter, request.Cursor, request.PageSize, cancellationToken);
}

public sealed record GetContactHistorySummaryQuery(Guid HubId, ContactsByGuestFilter Filter) : IRequest<ContactHistorySummaryDto>;

public sealed class GetContactHistorySummaryQueryHandler(IContactReadService reads)
    : IRequestHandler<GetContactHistorySummaryQuery, ContactHistorySummaryDto>
{
    public Task<ContactHistorySummaryDto> Handle(GetContactHistorySummaryQuery request, CancellationToken cancellationToken) =>
        reads.GetContactHistorySummaryAsync(request.HubId, request.Filter, cancellationToken);
}
