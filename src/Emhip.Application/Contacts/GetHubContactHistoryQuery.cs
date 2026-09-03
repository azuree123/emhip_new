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
