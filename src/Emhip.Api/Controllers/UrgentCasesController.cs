using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>
/// Triage list of flagged cases. Served from the read model for the initial load; live
/// updates arrive over /hubs/urgent-cases (SignalR) rather than polling.
/// </summary>
[ApiController]
[Route("urgent-cases")]
public sealed class UrgentCasesController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetUrgentCasesQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }
}
