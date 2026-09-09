namespace Emhip.Application.UrgentCases;

public interface IUrgentCaseReadService
{
    Task<IReadOnlyList<UrgentCaseDto>> GetActiveUrgentCasesAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<UrgentEpisodeDto?> GetOpenEpisodeAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UrgentEpisodeDto>> GetResolvedEpisodesAsync(Guid hubId, CancellationToken cancellationToken = default);

    /// <summary>All episodes for a guest in the caller's hub, oldest first (empty when the guest is not in the hub).</summary>
    Task<IReadOnlyList<UrgentEpisodeSummaryDto>> GetEpisodesForGuestAsync(Guid hubId, Guid guestId, CancellationToken cancellationToken = default);

    /// <summary>The composed Urgent Episode Record; null when the episode or its guest is outside the hub.</summary>
    Task<UrgentEpisodeRecordDto?> GetEpisodeRecordAsync(Guid hubId, Guid episodeId, int responseHours, CancellationToken cancellationToken = default);
}
