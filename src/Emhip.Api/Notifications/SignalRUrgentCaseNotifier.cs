using Emhip.Api.Hubs;
using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;
using Microsoft.AspNetCore.SignalR;

namespace Emhip.Api.Notifications;

public sealed class SignalRUrgentCaseNotifier(IHubContext<UrgentCasesHub> hubContext) : IUrgentCaseNotifier
{
    public Task NotifyUrgentCaseAsync(Guid hubId, UrgentCaseDto urgentCase, CancellationToken cancellationToken = default) =>
        hubContext.Clients.Group(UrgentCasesHub.GroupName(hubId)).SendAsync("urgentCaseEscalated", urgentCase, cancellationToken);
}
