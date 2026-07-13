using System.Net.Http.Json;
using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;
using Microsoft.Extensions.Configuration;

namespace Emhip.Workers.Notifications;

/// <summary>
/// Emhip.Workers has no WebSocket listeners of its own, so it can't host the SignalR hub —
/// instead it calls a small internal endpoint on Emhip.Api, which holds the live client
/// connections and does the actual hub broadcast. See Emhip.Api's InternalNotificationsController.
/// Authenticated with a shared secret (Internal:SharedSecret) since the worker has no signed-in
/// user of its own. In a multi-node deployment this would go through an internal service mesh
/// instead; swap for direct Azure SignalR Service publishing if that's adopted.
/// </summary>
public sealed class HttpUrgentCaseNotifier(HttpClient httpClient, IConfiguration configuration) : IUrgentCaseNotifier
{
    public async Task NotifyUrgentCaseAsync(Guid hubId, UrgentCaseDto urgentCase, CancellationToken cancellationToken = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "internal/urgent-cases/notify")
        {
            Content = JsonContent.Create(new { hubId, urgentCase }),
        };
        request.Headers.Add("X-Internal-Secret", configuration["Internal:SharedSecret"] ?? string.Empty);

        var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }
}
