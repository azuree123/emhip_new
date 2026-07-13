using System.Net.Http.Json;
using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;

namespace Emhip.Workers.Notifications;

/// <summary>
/// Emhip.Workers has no WebSocket listeners of its own, so it can't host the SignalR hub —
/// instead it calls a small internal endpoint on Emhip.Api, which holds the live client
/// connections and does the actual hub broadcast. See Emhip.Api's InternalNotificationsController.
/// In a multi-node deployment this would go through an internal service mesh / shared secret
/// the same way; swap for direct Azure SignalR Service publishing if that's adopted instead.
/// </summary>
public sealed class HttpUrgentCaseNotifier(HttpClient httpClient) : IUrgentCaseNotifier
{
    public async Task NotifyUrgentCaseAsync(Guid hubId, UrgentCaseDto urgentCase, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync("internal/urgent-cases/notify", new { hubId, urgentCase }, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
