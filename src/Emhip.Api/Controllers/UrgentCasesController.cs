using Emhip.Application.Abstractions;
using Emhip.Application.UrgentCases;
using Emhip.Domain.Authorization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

[ApiController]
[Route("urgent-cases")]
[Authorize(Policy = Permissions.UrgentCases.View)]
public sealed class UrgentCasesController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetUrgentCasesQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }

    /// <summary>Resolved urgent episodes — backs the "Urgent Episode Record" history.</summary>
    [HttpGet("resolved")]
    public async Task<IActionResult> GetResolved(CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetResolvedUrgentEpisodesQuery(currentUser.HubId), cancellationToken);
        return Ok(result);
    }

    /// <summary>The guest's currently open urgent episode (escalation state, CMHT details); 404 when none.</summary>
    [HttpGet("{guestId:guid}/episode")]
    public async Task<ActionResult<UrgentEpisodeDto>> GetOpenEpisode(Guid guestId, CancellationToken cancellationToken)
    {
        var result = await mediator.Send(new GetOpenUrgentEpisodeQuery(guestId), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>"Escalate to CMHT" — stamps the escalation onto the guest's open urgent episode.</summary>
    [HttpPost("{guestId:guid}/escalate-cmht")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> EscalateToCmht(Guid guestId, [FromBody] EscalateToCmhtRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new EscalateToCmhtCommand(guestId, request.CmhtTeam, request.Reason, request.Urgency, request.Notes), cancellationToken);
        return NoContent();
    }

    /// <summary>"Mark episode as resolved" — closes the episode and returns the guest to Active.</summary>
    [HttpPost("{guestId:guid}/resolve")]
    [Authorize(Policy = Permissions.Guests.ClinicalEdit)]
    public async Task<IActionResult> Resolve(Guid guestId, [FromBody] ResolveUrgentCaseRequest request, CancellationToken cancellationToken)
    {
        await mediator.Send(new ResolveUrgentCaseCommand(guestId, request.ResolutionNote), cancellationToken);
        return NoContent();
    }

    public sealed record EscalateToCmhtRequest(string CmhtTeam, string? Reason, string? Urgency, string? Notes);

    public sealed record ResolveUrgentCaseRequest(string? ResolutionNote);
}
