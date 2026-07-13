using Emhip.Application.Common;
using Emhip.Application.Guests.Dtos;
using Emhip.Domain.Enums;
using MediatR;

namespace Emhip.Application.Guests.Queries;

public sealed record GetGuestListQuery(Guid HubId, string? SearchText, GuestStatus? Status, string? Cursor, int PageSize)
    : IRequest<KeysetPage<GuestListItemDto>>;

public sealed class GetGuestListQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestListQuery, KeysetPage<GuestListItemDto>>
{
    public Task<KeysetPage<GuestListItemDto>> Handle(GetGuestListQuery request, CancellationToken cancellationToken) =>
        reads.GetGuestListAsync(request.HubId, request.SearchText, request.Status, request.Cursor, request.PageSize, cancellationToken);
}
