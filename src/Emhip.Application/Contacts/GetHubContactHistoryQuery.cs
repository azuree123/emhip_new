using Emhip.Application.Common;
using FluentValidation;
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

/// <summary>Contact History screen — the contacts behind one stat tile, keyset-paged, newest first.</summary>
public sealed record GetContactListQuery(Guid HubId, ContactListKind Kind, ContactsByGuestFilter Filter, string? Cursor, int PageSize)
    : IRequest<KeysetPage<ContactListRowDto>>;

public sealed class GetContactListQueryValidator : AbstractValidator<GetContactListQuery>
{
    public GetContactListQueryValidator()
    {
        RuleFor(x => x.Kind).IsInEnum();
    }
}

public sealed class GetContactListQueryHandler(IContactReadService reads)
    : IRequestHandler<GetContactListQuery, KeysetPage<ContactListRowDto>>
{
    public Task<KeysetPage<ContactListRowDto>> Handle(GetContactListQuery request, CancellationToken cancellationToken) =>
        reads.GetContactListAsync(request.HubId, request.Kind, request.Filter, request.Cursor, request.PageSize, cancellationToken);
}
