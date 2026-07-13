using Emhip.Application.Abstractions;
using Emhip.Application.Dashboards;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Dashboard (CMHW) and Service Overview (Hub Manager) screens — both served from precomputed read models.</summary>
[ApiController]
[Route("dashboards")]
[Authorize]
public sealed class DashboardsController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet("cmhw")]
    [Authorize(Policy = Permissions.Dashboard.ViewCmhw)]
    public async Task<IActionResult> GetCmhwDashboard(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetCmhwDashboardQuery(currentUser.StaffId, currentUser.HubId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("hub-manager")]
    [Authorize(Policy = Permissions.Dashboard.ViewHubManager)]
    public async Task<IActionResult> GetHubManagerDashboard(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetHubManagerDashboardQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }
}
