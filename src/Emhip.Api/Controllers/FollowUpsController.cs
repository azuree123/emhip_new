using Emhip.Application.Abstractions;
using Emhip.Application.FollowUps;
using Emhip.Application.Guests.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Global Follow-up queue.</summary>
[ApiController]
[Route("followups")]
public sealed class FollowUpsController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetQueue(
        [FromQuery] bool overdue = false, [FromQuery] Guid? assignee = null, [FromQuery] string? cursor = null,
        [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new GetFollowUpQueueQuery(currentUser.HubId, overdue, assignee, cursor, Math.Clamp(pageSize, 1, 200)), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{followUpId:guid}/complete")]
    public async Task<IActionResult> Complete(Guid followUpId, CancellationToken cancellationToken)
    {
        await mediator.Send(new CompleteFollowUpCommand(followUpId), cancellationToken);
        return NoContent();
    }
}
