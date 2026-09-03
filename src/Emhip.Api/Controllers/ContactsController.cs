using Emhip.Application.Abstractions;
using Emhip.Application.Contacts;
using Emhip.Domain.Authorization;
using Emhip.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Emhip.Api.Controllers;

/// <summary>Hub-wide "Contact History" nav screen — every contact logged against guests in the caller's hub.</summary>
[ApiController]
[Route("contacts")]
[Authorize]
public sealed class ContactsController(IMediator mediator, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Keyset-paginated, newest first. Pass the `cursor` from the previous response for the next page.</summary>
    [HttpGet]
    [Authorize(Policy = Permissions.Guests.View)]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string? q, [FromQuery] Guid? guest = null, [FromQuery] Guid? loggedBy = null, [FromQuery] Guid? cmhw = null,
        [FromQuery] ContactType? type = null, [FromQuery] ContactOutcome? outcome = null,
        [FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null,
        [FromQuery] string? cursor = null, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var filter = new ContactHistoryFilter(q, guest, loggedBy, cmhw, type, outcome, from, to);
        var result = await mediator.Send(
            new GetHubContactHistoryQuery(currentUser.HubId, filter, cursor, Math.Clamp(pageSize, 1, 200)), cancellationToken);
        return Ok(result);
    }
}
