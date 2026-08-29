using Emhip.Application.Common;
using Emhip.Application.Guests.Dtos;
using MediatR;

namespace Emhip.Application.Guests.Queries;

/// <summary>Contact History tab — keyset-paginated so a long-standing guest's history stays fast.</summary>
public sealed record GetContactHistoryQuery(Guid GuestId, string? Cursor, int PageSize) : IRequest<KeysetPage<GuestContactSummaryDto>>;

public sealed class GetContactHistoryQueryHandler(IGuestReadService reads)
    : IRequestHandler<GetContactHistoryQuery, KeysetPage<GuestContactSummaryDto>>
{
    public Task<KeysetPage<GuestContactSummaryDto>> Handle(GetContactHistoryQuery request, CancellationToken cancellationToken) =>
        reads.GetContactHistoryAsync(request.GuestId, request.Cursor, request.PageSize, cancellationToken);
}
