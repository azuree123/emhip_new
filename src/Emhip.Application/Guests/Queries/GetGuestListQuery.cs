using Emhip.Application.Common;
using Emhip.Application.Guests.Dtos;
using Emhip.Domain.Enums;
using MediatR;

namespace Emhip.Application.Guests.Queries;

public sealed record GetGuestListQuery(
    Guid HubId, string? SearchText, GuestStatus? Status, string? Cursor, int PageSize,
    PathwayCategory? Pathway = null, bool? HasRiskFlags = null, Guid? AssignedCmhwId = null, int? LastActivityWithinDays = null,
    bool? UrgentOnly = null,
    // Demographic filters behind the Guest Report's "Additional filters" drawer.
    string? Ethnicity = null,
    string? Gender = null,
    string? CountryOfOrigin = null,
    int? AgeMin = null,
    int? AgeMax = null)
    : IRequest<KeysetPage<GuestListItemDto>>;

public sealed class GetGuestListQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestListQuery, KeysetPage<GuestListItemDto>>
{
    public Task<KeysetPage<GuestListItemDto>> Handle(GetGuestListQuery request, CancellationToken cancellationToken) =>
        reads.GetGuestListAsync(
            request.HubId, request.SearchText, request.Status, request.Cursor, request.PageSize,
            request.Pathway, request.HasRiskFlags, request.AssignedCmhwId, request.LastActivityWithinDays, request.UrgentOnly,
            request.Ethnicity, request.Gender, request.CountryOfOrigin, request.AgeMin, request.AgeMax, cancellationToken);
}

public sealed record GetHubCmhwsQuery(Guid HubId) : IRequest<IReadOnlyList<CmhwOptionDto>>;

public sealed class GetHubCmhwsQueryHandler(IGuestReadService reads) : IRequestHandler<GetHubCmhwsQuery, IReadOnlyList<CmhwOptionDto>>
{
    public Task<IReadOnlyList<CmhwOptionDto>> Handle(GetHubCmhwsQuery request, CancellationToken cancellationToken) =>
        reads.GetHubCmhwsAsync(request.HubId, cancellationToken);
}
