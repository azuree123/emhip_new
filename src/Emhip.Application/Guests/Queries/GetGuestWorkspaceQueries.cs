using Emhip.Application.Guests.Dtos;
using MediatR;

namespace Emhip.Application.Guests.Queries;

// Each Guest Workspace tab is its own query/endpoint — never one big "get everything" call.

public sealed record GetGuestSuggestionsQuery(Guid HubId, string Query, int Limit) : IRequest<IReadOnlyList<GuestSuggestionDto>>;
public sealed class GetGuestSuggestionsQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestSuggestionsQuery, IReadOnlyList<GuestSuggestionDto>>
{
    public Task<IReadOnlyList<GuestSuggestionDto>> Handle(GetGuestSuggestionsQuery request, CancellationToken cancellationToken) =>
        reads.SuggestAsync(request.HubId, request.Query, request.Limit, cancellationToken);
}

public sealed record GetGuestOverviewQuery(Guid GuestId) : IRequest<GuestOverviewDto?>;
public sealed class GetGuestOverviewQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestOverviewQuery, GuestOverviewDto?>
{
    public Task<GuestOverviewDto?> Handle(GetGuestOverviewQuery request, CancellationToken cancellationToken) =>
        reads.GetOverviewAsync(request.GuestId, cancellationToken);
}

public sealed record GetGuestDemographicsQuery(Guid GuestId) : IRequest<GuestDemographicsDto?>;
public sealed class GetGuestDemographicsQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestDemographicsQuery, GuestDemographicsDto?>
{
    public Task<GuestDemographicsDto?> Handle(GetGuestDemographicsQuery request, CancellationToken cancellationToken) =>
        reads.GetDemographicsAsync(request.GuestId, cancellationToken);
}

public sealed record GetGuestClinicalQuery(Guid GuestId) : IRequest<GuestClinicalDto?>;
public sealed class GetGuestClinicalQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestClinicalQuery, GuestClinicalDto?>
{
    public Task<GuestClinicalDto?> Handle(GetGuestClinicalQuery request, CancellationToken cancellationToken) =>
        reads.GetClinicalAsync(request.GuestId, cancellationToken);
}

public sealed record GetGuestPathwayQuery(Guid GuestId) : IRequest<GuestPathwayDto?>;
public sealed class GetGuestPathwayQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestPathwayQuery, GuestPathwayDto?>
{
    public Task<GuestPathwayDto?> Handle(GetGuestPathwayQuery request, CancellationToken cancellationToken) =>
        reads.GetPathwayAsync(request.GuestId, cancellationToken);
}

public sealed record GetGuestFollowUpsQuery(Guid GuestId) : IRequest<GuestFollowUpsDto?>;
public sealed class GetGuestFollowUpsQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestFollowUpsQuery, GuestFollowUpsDto?>
{
    public Task<GuestFollowUpsDto?> Handle(GetGuestFollowUpsQuery request, CancellationToken cancellationToken) =>
        reads.GetFollowUpsAsync(request.GuestId, cancellationToken);
}

public sealed record GetGuestInitialConversationQuery(Guid GuestId) : IRequest<GuestInitialConversationDto?>;
public sealed class GetGuestInitialConversationQueryHandler(IGuestReadService reads) : IRequestHandler<GetGuestInitialConversationQuery, GuestInitialConversationDto?>
{
    public Task<GuestInitialConversationDto?> Handle(GetGuestInitialConversationQuery request, CancellationToken cancellationToken) =>
        reads.GetInitialConversationAsync(request.GuestId, cancellationToken);
}
