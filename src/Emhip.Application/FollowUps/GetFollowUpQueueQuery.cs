using Emhip.Application.Common;
using MediatR;

namespace Emhip.Application.FollowUps;

// OpenOnly: Scheduled and Overdue items only — what the dashboards count as outstanding.
public sealed record GetFollowUpQueueQuery(Guid HubId, bool OverdueOnly, Guid? AssigneeStaffId, string? Cursor, int PageSize, bool OpenOnly = false)
    : IRequest<KeysetPage<FollowUpQueueItemDto>>;

public sealed class GetFollowUpQueueQueryHandler(IFollowUpReadService reads)
    : IRequestHandler<GetFollowUpQueueQuery, KeysetPage<FollowUpQueueItemDto>>
{
    public Task<KeysetPage<FollowUpQueueItemDto>> Handle(GetFollowUpQueueQuery request, CancellationToken cancellationToken) =>
        reads.GetQueueAsync(request.HubId, request.OverdueOnly, request.AssigneeStaffId, request.Cursor, request.PageSize, request.OpenOnly, cancellationToken);
}
