using Emhip.Api.Hubs;
using Emhip.Application.UrgentCases;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Emhip.Api.Controllers;

/// <summary>
/// Service-to-service endpoint: Emhip.Workers.EscalationWorker calls this to broadcast over
/// SignalR, since only Emhip.Api holds the live client connections. Guard with a shared
/// secret / internal network policy in a real deployment — kept open here for the dev seam.
/// </summary>
[ApiController]
[Route("internal/urgent-cases")]
public sealed class InternalNotificationsController(IHubContext<UrgentCasesHub> hubContext) : ControllerBase
{
    public sealed record NotifyRequest(Guid HubId, UrgentCaseDto UrgentCase);

    [HttpPost("notify")]
    public async Task<IActionResult> Notify([FromBody] NotifyRequest request, CancellationToken cancellationToken)
    {
        await hubContext.Clients.Group(UrgentCasesHub.GroupName(request.HubId)).SendAsync("urgentCaseEscalated", request.UrgentCase, cancellationToken);
        return NoContent();
    }
}
