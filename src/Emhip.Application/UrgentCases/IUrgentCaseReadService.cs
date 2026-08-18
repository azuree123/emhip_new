namespace Emhip.Application.UrgentCases;

public interface IUrgentCaseReadService
{
    Task<IReadOnlyList<UrgentCaseDto>> GetActiveUrgentCasesAsync(Guid hubId, CancellationToken cancellationToken = default);
    Task<UrgentEpisodeDto?> GetOpenEpisodeAsync(Guid guestId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UrgentEpisodeDto>> GetResolvedEpisodesAsync(Guid hubId, CancellationToken cancellationToken = default);
}
