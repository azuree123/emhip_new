using Emhip.Api.Hubs;
using Emhip.Application.UrgentCases;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Emhip.Api.Controllers;

/// <summary>
/// Service-to-service endpoint: Emhip.Workers.EscalationWorker calls this to broadcast over
/// SignalR, since only Emhip.Api holds the live client connections. Guarded by a shared secret
/// (Internal:SharedSecret, matched against Emhip.Workers' Internal__SharedSecret config) rather
/// than user auth — the worker has no signed-in user. This is a stopgap for a single-node
/// deployment; move it behind the internal network boundary or replace with Azure SignalR
/// Service before exposing either process publicly (see README "Production considerations").
/// </summary>
[ApiController]
[Route("internal/urgent-cases")]
[AllowAnonymous]
public sealed class InternalNotificationsController(IHubContext<UrgentCasesHub> hubContext, IConfiguration configuration) : ControllerBase
{
    public sealed record NotifyRequest(Guid HubId, UrgentCaseDto UrgentCase);

    [HttpPost("notify")]
    public async Task<IActionResult> Notify([FromBody] NotifyRequest request, [FromHeader(Name = "X-Internal-Secret")] string? secret, CancellationToken cancellationToken)
    {
        var expectedSecret = configuration["Internal:SharedSecret"];
        if (string.IsNullOrEmpty(expectedSecret) || secret != expectedSecret)
        {
            return Unauthorized();
        }

        await hubContext.Clients.Group(UrgentCasesHub.GroupName(request.HubId)).SendAsync("urgentCaseEscalated", request.UrgentCase, cancellationToken);
        return NoContent();
    }

    public sealed record NotifyResolvedRequest(Guid HubId, Guid GuestId);

    [HttpPost("notify-resolved")]
    public async Task<IActionResult> NotifyResolved([FromBody] NotifyResolvedRequest request, [FromHeader(Name = "X-Internal-Secret")] string? secret, CancellationToken cancellationToken)
    {
        var expectedSecret = configuration["Internal:SharedSecret"];
        if (string.IsNullOrEmpty(expectedSecret) || secret != expectedSecret)
        {
            return Unauthorized();
        }

        await hubContext.Clients.Group(UrgentCasesHub.GroupName(request.HubId)).SendAsync("urgentCaseResolved", request.GuestId, cancellationToken);
        return NoContent();
    }
}
