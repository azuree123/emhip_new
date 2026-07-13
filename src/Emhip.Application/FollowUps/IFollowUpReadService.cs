using Emhip.Application.Common;

namespace Emhip.Application.FollowUps;

public interface IFollowUpReadService
{
    /// <summary>Keyset-paginated per ARCHITECTURE.md — the Global Follow-up queue must never offset-page.</summary>
    Task<KeysetPage<FollowUpQueueItemDto>> GetQueueAsync(
        Guid hubId, bool overdueOnly, Guid? assigneeStaffId, string? cursor, int pageSize, CancellationToken cancellationToken = default);
}
