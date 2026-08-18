using Emhip.Application.UrgentCases;

namespace Emhip.Application.Abstractions;

/// <summary>
/// Push seam for the Urgent Cases queue. Implemented with SignalR in Emhip.Api and called from
/// Emhip.Workers.EscalationWorker, which runs outside any HTTP request — hubId is passed
/// explicitly rather than resolved from ICurrentUser.
/// </summary>
public interface IUrgentCaseNotifier
{
    Task NotifyUrgentCaseAsync(Guid hubId, UrgentCaseDto urgentCase, CancellationToken cancellationToken = default);
    Task NotifyUrgentCaseResolvedAsync(Guid hubId, Guid guestId, CancellationToken cancellationToken = default);
}
