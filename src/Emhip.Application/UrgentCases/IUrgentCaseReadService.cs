namespace Emhip.Application.UrgentCases;

public interface IUrgentCaseReadService
{
    Task<IReadOnlyList<UrgentCaseDto>> GetActiveUrgentCasesAsync(Guid hubId, CancellationToken cancellationToken = default);
}
